package com.ainote.service;

import com.ainote.dto.AuthResponse;
import com.ainote.dto.LoginRequest;
import com.ainote.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse getMe(Long userId);
}
