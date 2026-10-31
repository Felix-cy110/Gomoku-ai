package dev.yijian.gomoku.service;

import dev.yijian.gomoku.entity.HealthStatus;

/**
 * 服务健康状态的业务接口。
 */
public interface HealthService {

    HealthStatus getHealth();
}
