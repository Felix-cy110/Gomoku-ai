package dev.yijian.gomoku;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class GomokuApplicationTest {

    @Test
    void noLongerAcceptsADataDirectory() {
        assertThrows(IllegalArgumentException.class,
                () -> GomokuApplication.main(new String[] {"--data-dir", ".local"}));
        assertThrows(IllegalArgumentException.class,
                () -> GomokuApplication.main(new String[] {"--data-dir=.local"}));
    }
}
