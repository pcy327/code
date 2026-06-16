package com.ainote.controller;

import com.ainote.common.Result;
import com.ainote.dto.FileUploadResponse;
import com.ainote.service.OssService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final OssService ossService;

    /**
     * Upload an image file to Alibaba Cloud OSS.
     * Returns the public URL for use in Markdown: ![alt](url)
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<FileUploadResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        String url = ossService.uploadFile(file);
        return Result.success(new FileUploadResponse(
                url,
                file.getOriginalFilename(),
                file.getSize()
        ));
    }
}
