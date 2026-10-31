package dev.yijian.gomoku.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 服务元信息配置，绑定 application.properties 中的 gomoku.service 配置项。
 */
@ConfigurationProperties(prefix = "gomoku.service")
public record ServiceProperties(String name, String version) {
}
