/**
 * 数据访问层预留包。
 *
 * <p>当前版本不持久化用户设置或棋局，没有数据库、Mapper 实现或 Mapper 扫描配置。
 * 后续需要数据访问时，在此定义 Mapper 接口，由 service.impl 调用，
 * 不在 controller 中直接访问数据库。
 */
package dev.yijian.gomoku.mapper;
