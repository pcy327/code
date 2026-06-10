package com.ainote.mapper;

import com.ainote.entity.NoteTag;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface NoteTagMapper extends BaseMapper<NoteTag> {

    List<Long> selectTagIdsByNoteId(@Param("noteId") Long noteId);
}
