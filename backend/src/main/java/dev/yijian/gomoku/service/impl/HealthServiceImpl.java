package dev.yijian.gomoku.service.impl;

import dev.yijian.gomoku.config.ServiceProperties;
import dev.yijian.gomoku.entity.HealthStatus;
import dev.yijian.gomoku.service.HealthService;
import org.springframework.stereotype.Service;

/**
 * 根据服务配置构建健康状态。
 */
@Service
public class HealthServiceImpl implements HealthService {

    private final ServiceProperties serviceProperties;

    public HealthServiceImpl(ServiceProperties serviceProperties) {
        this.serviceProperties = serviceProperties;
    }

    @Override
    public HealthStatus getHealth() {
        return new HealthStatus("ok", serviceProperties.name(), serviceProperties.version());
    }
}
