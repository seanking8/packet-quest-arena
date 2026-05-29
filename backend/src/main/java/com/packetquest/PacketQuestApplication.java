package com.packetquest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PacketQuestApplication {
    public static void main(String[] args) {
        SpringApplication.run(PacketQuestApplication.class, args);
    }
}
