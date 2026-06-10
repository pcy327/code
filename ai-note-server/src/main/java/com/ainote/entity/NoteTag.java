package com.ainote.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("note_tag")
public class NoteTag {
    private Long noteId;
    private Long tagId;
}
