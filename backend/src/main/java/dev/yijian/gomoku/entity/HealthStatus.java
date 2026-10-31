package dev.yijian.gomoku.entity;

/**
 * 服务健康状态，属于内存中的业务对象，不对应数据库表。
 *
 * @param status 当前状态
 * @param service 对外服务标识
 * @param version 服务版本
 */
public record HealthStatus(String status, String service, String version) {
}
