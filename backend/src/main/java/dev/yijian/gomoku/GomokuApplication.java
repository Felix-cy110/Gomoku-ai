package dev.yijian.gomoku;

import dev.yijian.gomoku.utils.ApplicationArgumentsUtils;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class GomokuApplication {

    public static void main(String[] args) {
        ApplicationArgumentsUtils.validate(args);
        SpringApplication.run(GomokuApplication.class, args);
    }
}
