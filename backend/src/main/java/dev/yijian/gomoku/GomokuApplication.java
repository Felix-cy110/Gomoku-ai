package dev.yijian.gomoku;

import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GomokuApplication {
    public static void main(String[] args) {
        if (new DefaultApplicationArguments(args).containsOption("data-dir")) {
            throw new IllegalArgumentException("The --data-dir option is no longer supported");
        }
        SpringApplication.run(GomokuApplication.class, args);
    }
}
