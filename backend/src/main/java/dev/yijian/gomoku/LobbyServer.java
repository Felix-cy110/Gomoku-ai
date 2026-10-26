package dev.yijian.gomoku;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class LobbyServer implements AutoCloseable {
    private final Gson gson = new GsonBuilder().disableHtmlEscaping().create();
    private final HttpServer server;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    public LobbyServer(int port) throws IOException {
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
            respond(exchange, 404, Map.of("error", "接口不存在"));
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
        for (int i = 0; i < args.length; i++) {
            if (i + 1 >= args.length) throw new IllegalArgumentException("Missing argument value");
            switch (args[i]) {
                case "--port" -> port = Integer.parseInt(args[++i]);
                default -> throw new IllegalArgumentException("Unknown argument: " + args[i]);
            }
        }
        LobbyServer app = new LobbyServer(port);
        Runtime.getRuntime().addShutdownHook(new Thread(app::close));
        app.start();
        System.out.println("Yijian lobby listening on http://127.0.0.1:" + app.port());
    }
}
