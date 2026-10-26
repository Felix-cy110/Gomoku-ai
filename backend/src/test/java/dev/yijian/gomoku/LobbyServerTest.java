package dev.yijian.gomoku;

import static org.junit.jupiter.api.Assertions.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LobbyServerTest {
    private LobbyServer server;
    private final HttpClient client = HttpClient.newHttpClient();

    @BeforeEach void start() throws Exception {
        server = new LobbyServer(0);
        server.start();
    }

    @AfterEach void stop() { server.close(); }

    private HttpResponse<String> request(String method, String route, String body, String contentType) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.port() + route));
        if (contentType != null) builder.header("Content-Type", contentType);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    @Test void returnsHealthWithoutCaching() throws Exception {
        HttpResponse<String> health = request("GET", "/api/health", null, null);
        assertEquals(200, health.statusCode());
        assertTrue(health.body().contains("yijian-lobby"));
        assertEquals("no-store", health.headers().firstValue("Cache-Control").orElseThrow());
    }

    @Test void preferenceReadAndWriteEndpointsAreRemoved() throws Exception {
        String legacyPreferences = "{\"mode\":\"single\",\"difficulty\":\"hard\",\"color\":\"white\",\"playerOne\":\"甲\",\"playerTwo\":\"乙\"}";
        assertEquals(404, request("GET", "/api/preferences", null, null).statusCode());
        for (String method : new String[]{"PUT", "POST", "PATCH"}) {
            assertEquals(404, request(method, "/api/preferences", legacyPreferences, "application/json").statusCode());
        }
        server.close();
        server = new LobbyServer(0);
        server.start();
        assertEquals(404, request("GET", "/api/preferences", null, null).statusCode());
        assertEquals(200, request("GET", "/api/health", null, null).statusCode());
    }

    @Test void rejectsUnsupportedRequests() throws Exception {
        assertEquals(404, request("GET", "/api/health/extra", null, null).statusCode());
        HttpResponse<String> result = request("PUT", "/api/health", "{}", "application/json");
        assertEquals(405, result.statusCode());
        assertEquals("GET", result.headers().firstValue("Allow").orElseThrow());
    }

    @Test void noLongerAcceptsADataDirectory() {
        assertThrows(IllegalArgumentException.class,
                () -> LobbyServer.main(new String[]{"--data-dir", ".local"}));
    }
}
