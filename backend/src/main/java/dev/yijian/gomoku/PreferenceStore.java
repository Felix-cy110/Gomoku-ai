package dev.yijian.gomoku;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

final class PreferenceStore {
    private final Path file;
    private final Gson gson;
    private GamePreferences preferences;

    PreferenceStore(Path directory, Gson gson) throws IOException {
        this.file = directory.resolve("preferences.json");
        this.gson = gson;
        Files.createDirectories(directory);
        this.preferences = read();
    }

    private GamePreferences read() throws IOException {
        if (!Files.exists(file)) return GamePreferences.defaults();
        try {
            GamePreferences saved = gson.fromJson(Files.readString(file, StandardCharsets.UTF_8), GamePreferences.class);
            if (saved == null) throw new IllegalArgumentException("Empty preferences");
            return saved.validated();
        } catch (JsonParseException | IllegalArgumentException exception) {
            // Keep the original file for recovery; a later successful save replaces it.
            System.err.println("Saved preferences are invalid; using defaults.");
            return GamePreferences.defaults();
        }
    }

    synchronized GamePreferences get() { return preferences; }

    synchronized GamePreferences save(GamePreferences next) throws IOException {
        GamePreferences validated = next.validated();
        Path temporary = Files.createTempFile(file.getParent(), "preferences-", ".tmp");
        try {
            Files.writeString(temporary, gson.toJson(validated), StandardCharsets.UTF_8);
            try {
                Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING);
            }
            preferences = validated;
            return preferences;
        } finally {
            Files.deleteIfExists(temporary);
        }
    }
}
