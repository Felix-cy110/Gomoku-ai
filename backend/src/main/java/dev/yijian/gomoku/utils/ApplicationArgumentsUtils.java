package dev.yijian.gomoku.utils;

import org.springframework.boot.DefaultApplicationArguments;

/**
 * 启动参数校验工具，不持有应用状态。
 */
public final class ApplicationArgumentsUtils {

    private ApplicationArgumentsUtils() {
    }

    public static void validate(String[] args) {
        if (new DefaultApplicationArguments(args).containsOption("data-dir")) {
            throw new IllegalArgumentException("The --data-dir option is no longer supported");
        }
    }
}
