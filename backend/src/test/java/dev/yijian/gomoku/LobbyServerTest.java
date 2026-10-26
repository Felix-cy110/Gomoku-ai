package dev.yijian.gomoku;

import static org.junit.jupiter.api.Assertions.*;
import com.google.gson.Gson;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LobbyServerTest {
    @TempDir Path directory;
    private LobbyServer server;
    private final HttpClient client = HttpClient.newHttpClient();
    private final Gson gson = new Gson();

    @BeforeEach void start() throws Exception {
        server = new LobbyServer(0, directory);
        server.start();
    }

    @AfterEach void stop() { server.close(); }

    private HttpResponse<String> request(String method, String route, String body, String contentType) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.port() + route));
        if (contentType != null) builder.header("Content-Type", contentType);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    @Test void returnsDefaultsAndHealth() throws Exception {
        HttpResponse<String> health = request("GET", "/api/health", null, null);
        assertEquals(200, health.statusCode());
        assertTrue(health.body().contains("yijian-lobby"));
        HttpResponse<String> result = request("GET", "/api/preferences", null, null);
        assertEquals(200, result.statusCode());
        assertEquals(GamePreferences.defaults(), gson.fromJson(result.body(), GamePreferences.class));
    }

    @Test void persistsChineseNamesAcrossRestart() throws Exception {
        GamePreferences preferences = new GamePreferences("local", "hard", "white", "  小林  ", "小白");
        HttpResponse<String> saved = request("PUT", "/api/preferences", gson.toJson(preferences), "application/json");
        assertEquals(200, saved.statusCode());
        server.close();
        server = new LobbyServer(0, directory);
        server.start();
        GamePreferences loaded = gson.fromJson(request("GET", "/api/preferences", null, null).body(), GamePreferences.class);
        assertEquals("local", loaded.mode());
        assertEquals("hard", loaded.difficulty());
        assertEquals("white", loaded.color());
        assertEquals("小林", loaded.playerOne());
        assertEquals("小白", loaded.playerTwo());
    }

    @Test void rejectsInvalidInputWithoutChangingPreferences() throws Exception {
        for (String invalid : new String[]{"null", "{", "{}", "[]",
            gson.toJson(new GamePreferences("online", "normal", "black", "甲", "乙")),
            gson.toJson(new GamePreferences("single", "impossible", "black", "甲", "乙")),
            gson.toJson(new GamePreferences("single", "normal", "red", "甲", "乙")),
            gson.toJson(new GamePreferences("local", "normal", "black", " ", "乙")),
            gson.toJson(new GamePreferences("local", "normal", "black", "长".repeat(17), "乙"))}) {
            assertEquals(400, request("PUT", "/api/preferences", invalid, "application/json").statusCode(), invalid);
        }
        assertEquals(GamePreferences.defaults(), gson.fromJson(request("GET", "/api/preferences", null, null).body(), GamePreferences.class));
    }

    @Test void rejectsUnsupportedRequestsAndOversizedBodies() throws Exception {
        assertEquals(404, request("GET", "/api/preferences/extra", null, null).statusCode());
        assertEquals(405, request("POST", "/api/preferences", "{}", "application/json").statusCode());
        assertEquals(405, request("PUT", "/api/health", "{}", "application/json").statusCode());
        assertEquals(415, request("PUT", "/api/preferences", "{}", "text/plain").statusCode());
        assertEquals(413, request("PUT", "/api/preferences", " ".repeat(4097), "application/json").statusCode());
    }

    @Test void corruptSavedFileFallsBackToDefaults() throws Exception {
        server.close();
        Files.writeString(directory.resolve("preferences.json"), "{broken", StandardCharsets.UTF_8);
        server = new LobbyServer(0, directory);
        server.start();
        assertEquals(GamePreferences.defaults(), gson.fromJson(request("GET", "/api/preferences", null, null).body(), GamePreferences.class));
        assertEquals("{broken", Files.readString(directory.resolve("preferences.json")));
    }
}
