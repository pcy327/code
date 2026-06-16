package com.ainote.dto;

import lombok.Data;

@Data
public class AiProcessRequest {
    private String text;
    private String action; // polish | translate | simplify | expand
}
