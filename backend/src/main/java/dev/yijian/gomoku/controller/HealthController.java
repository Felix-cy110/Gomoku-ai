package dev.yijian.gomoku.controller;

import dev.yijian.gomoku.entity.HealthStatus;
import dev.yijian.gomoku.service.HealthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 健康检查接口，仅负责 HTTP 请求与业务服务的衔接。
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    public HealthStatus health() {
        return healthService.getHealth();
    }
}
