package dev.yijian.gomoku;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> request(String method, String route, String body) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + route));
        if (body != null) {
            builder.header("Content-Type", "application/json");
        }
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private void assertJsonResponse(HttpResponse<String> response, int status, Map<String, String> body)
            throws Exception {
        assertEquals(status, response.statusCode());
        assertEquals(objectMapper.valueToTree(body), objectMapper.readTree(response.body()));
        assertTrue(MediaType.APPLICATION_JSON.isCompatibleWith(
                MediaType.parseMediaType(response.headers().firstValue("Content-Type").orElseThrow())));
        assertEquals("no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        assertEquals("nosniff", response.headers().firstValue("X-Content-Type-Options").orElseThrow());
        assertTrue(response.headers().allValues("Set-Cookie").isEmpty());
    }

    @Test
    void returnsHealthWithoutCachingOrCreatingSession() throws Exception {
        assertJsonResponse(request("GET", "/api/health", null), 200,
                Map.of("status", "ok", "service", "yijian-lobby", "version", "0.1.0"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PUT", "POST", "PATCH", "DELETE"})
    void preferenceReadAndWriteEndpointsAreRemoved(String method) throws Exception {
        String legacyPreferences = "{\"mode\":\"single\",\"difficulty\":\"hard\",\"color\":\"white\",\"playerOne\":\"甲\"}";
        assertJsonResponse(request(method, "/api/preferences", "GET".equals(method) ? null : legacyPreferences),
                404, Map.of("error", "接口不存在"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/health/extra", "/api/health/", "/api/missing"})
    void rejectsUnknownRoutes(String route) throws Exception {
        assertJsonResponse(request("GET", route, null), 404, Map.of("error", "接口不存在"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUT", "POST", "PATCH", "DELETE"})
    void rejectsUnsupportedRequests(String method) throws Exception {
        HttpResponse<String> response = request(method, "/api/health", "{}");
        assertJsonResponse(response, 405, Map.of("error", "不支持的请求方法"));
        assertEquals("GET", response.headers().firstValue("Allow").orElseThrow());
    }

    @Test
    void noLongerAcceptsADataDirectory() {
        assertThrows(IllegalArgumentException.class,
                () -> GomokuApplication.main(new String[]{"--data-dir", ".local"}));
        assertThrows(IllegalArgumentException.class,
                () -> GomokuApplication.main(new String[]{"--data-dir=.local"}));
    }
}
