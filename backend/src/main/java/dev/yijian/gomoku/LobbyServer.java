package dev.yijian.gomoku;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class LobbyServer implements AutoCloseable {
    private static final int MAX_BODY_BYTES = 4096;
    private final Gson gson = new GsonBuilder().disableHtmlEscaping().create();
    private final HttpServer server;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final PreferenceStore store;

    public LobbyServer(int port, Path dataDirectory) throws IOException {
        store = new PreferenceStore(dataDirectory, gson);
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/", this::handle);
        server.setExecutor(executor);
    }

    public void start() { server.start(); }
    public int port() { return server.getAddress().getPort(); }

    private void handle(HttpExchange exchange) throws IOException {
        try {
            String route = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            if ("/api/health".equals(route)) {
                if (!"GET".equals(method)) { methodNotAllowed(exchange, "GET"); return; }
                respond(exchange, 200, Map.of("status", "ok", "service", "yijian-lobby", "version", "0.1.0"));
                return;
            }
            if (!"/api/preferences".equals(route)) {
                respond(exchange, 404, Map.of("error", "接口不存在"));
                return;
            }
            if ("GET".equals(method)) {
                respond(exchange, 200, store.get());
            } else if ("PUT".equals(method)) {
                String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
                if (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).split(";", 2)[0].strip().equals("application/json")) {
                    respond(exchange, 415, Map.of("error", "请求需要使用 application/json"));
                    return;
                }
                byte[] body = exchange.getRequestBody().readNBytes(MAX_BODY_BYTES + 1);
                if (body.length > MAX_BODY_BYTES) {
                    respond(exchange, 413, Map.of("error", "请求内容过长"));
                    return;
                }
                GamePreferences preferences = gson.fromJson(new String(body, StandardCharsets.UTF_8), GamePreferences.class);
                if (preferences == null) throw new IllegalArgumentException("请提供对局设置");
                respond(exchange, 200, store.save(preferences));
            } else {
                methodNotAllowed(exchange, "GET, PUT");
            }
        } catch (JsonParseException | IllegalArgumentException exception) {
            respond(exchange, 400, Map.of("error", "对局设置格式不正确，请检查模式、难度、执子颜色和昵称"));
        } catch (IOException exception) {
            respond(exchange, 500, Map.of("error", "设置暂时无法保存"));
        } finally {
            exchange.close();
        }
    }

    private void methodNotAllowed(HttpExchange exchange, String allowed) throws IOException {
        exchange.getResponseHeaders().set("Allow", allowed);
        respond(exchange, 405, Map.of("error", "不支持的请求方法"));
    }

    private void respond(HttpExchange exchange, int status, Object result) throws IOException {
        byte[] bytes = gson.toJson(result).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }

    @Override public void close() {
        server.stop(0);
        executor.shutdownNow();
    }

    public static void main(String[] args) throws IOException {
        int port = 18080;
        Path dataDirectory = Path.of(".local");
        for (int i = 0; i < args.length; i++) {
            if (i + 1 >= args.length) throw new IllegalArgumentException("Missing argument value");
            switch (args[i]) {
                case "--port" -> port = Integer.parseInt(args[++i]);
                case "--data-dir" -> dataDirectory = Path.of(args[++i]);
                default -> throw new IllegalArgumentException("Unknown argument: " + args[i]);
            }
        }
        LobbyServer app = new LobbyServer(port, dataDirectory);
        Runtime.getRuntime().addShutdownHook(new Thread(app::close));
        app.start();
        System.out.println("Yijian lobby listening on http://127.0.0.1:" + app.port());
    }
}
