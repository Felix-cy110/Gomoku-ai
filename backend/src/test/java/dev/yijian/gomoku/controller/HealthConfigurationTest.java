package dev.yijian.gomoku.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "gomoku.service.name=configured-service",
        "gomoku.service.version=2.3.4"
})
@AutoConfigureMockMvc
class HealthConfigurationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsConfiguredMetadataThroughTheServiceLayer() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {
                          "status": "ok",
                          "service": "configured-service",
                          "version": "2.3.4"
                        }
                        """));
    }
}
