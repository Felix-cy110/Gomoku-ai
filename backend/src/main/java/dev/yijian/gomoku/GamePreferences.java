package dev.yijian.gomoku;

import java.util.Set;

public record GamePreferences(String mode, String difficulty, String color, String playerOne, String playerTwo) {
    public static GamePreferences defaults() {
        return new GamePreferences("single", "normal", "black", "棋手一", "棋手二");
    }

    public GamePreferences validated() {
        if (mode == null || !Set.of("single", "local").contains(mode)) {
            throw new IllegalArgumentException("请选择有效的对弈模式");
        }
        if (difficulty == null || !Set.of("easy", "normal", "hard").contains(difficulty)) {
            throw new IllegalArgumentException("请选择有效的难度");
        }
        if (color == null || !Set.of("black", "white").contains(color)) {
            throw new IllegalArgumentException("请选择有效的执子颜色");
        }
        return new GamePreferences(mode, difficulty, color, validateName(playerOne), validateName(playerTwo));
    }

    private static String validateName(String name) {
        if (name == null || name.isBlank() || name.strip().length() > 16
                || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("棋手昵称须为 1 至 16 个字符，且不能包含控制字符");
        }
        return name.strip();
    }
}
