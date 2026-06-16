package com.ainote.service;

import com.ainote.config.OssConfig;
import com.aliyun.oss.OSS;
import com.aliyun.oss.common.utils.BinaryUtil;
import com.aliyun.oss.model.ObjectMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OssService {

    private final OSS ossClient;
    private final OssConfig ossConfig;

    /**
     * Upload a file to OSS and return the public URL.
     *
     * @param file the uploaded file (image)
     * @return the public accessible OSS URL
     */
    public String uploadFile(MultipartFile file) {
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("仅支持图片文件上传");
        }

        // Validate file size (max 10MB)
        long maxSize = 10 * 1024 * 1024L;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("图片大小不能超过 10MB");
        }

        // Build object key: images/2025/01/31/uuid-originalname
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        } else {
            // Fallback: determine extension from content type
            ext = switch (contentType) {
                case "image/png" -> ".png";
                case "image/gif" -> ".gif";
                case "image/bmp" -> ".bmp";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            };
        }
        String objectKey = "images/" + datePrefix + "/" + UUID.randomUUID().toString().replace("-", "") + ext;

        // Upload
        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType(contentType);
            metadata.setContentLength(file.getSize());

            ossClient.putObject(ossConfig.getBucketName(), objectKey, file.getInputStream(), metadata);

            // Build public URL
            String domain = ossConfig.getDomain();
            if (domain != null && !domain.isBlank()) {
                return domain + "/" + objectKey;
            }
            return "https://" + ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/" + objectKey;

        } catch (IOException e) {
            log.error("OSS upload failed", e);
            throw new RuntimeException("图片上传失败，请稍后重试");
        }
    }
}
