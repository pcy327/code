package com.ainote.mapper;

import com.ainote.entity.Note;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface NoteMapper extends BaseMapper<Note> {

    IPage<Note> searchNotes(Page<Note> page,
                            @Param("userId") Long userId,
                            @Param("keyword") String keyword,
                            @Param("tagId") Long tagId);

    List<Note> selectTrashNotes(@Param("userId") Long userId);

    int restoreNote(@Param("id") Long id, @Param("userId") Long userId);

    int permanentlyDelete(@Param("id") Long id, @Param("userId") Long userId);
}
