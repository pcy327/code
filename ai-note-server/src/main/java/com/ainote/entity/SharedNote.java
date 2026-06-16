package com.ainote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("shared_note")
public class SharedNote {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long noteId;
    private Long userId;
    private String token;
    private String passwordHash;
    private LocalDateTime expiresAt;
    private Boolean isRevoked;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
