CREATE TABLE IF NOT EXISTS "user" (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    title VARCHAR(255) NOT NULL DEFAULT '未命名笔记',
    content TEXT,
    summary TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tag (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS note_tag (
    note_id BIGINT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_note_user_id ON note(user_id);
CREATE INDEX IF NOT EXISTS idx_note_updated_at ON note(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_is_deleted ON note(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tag_user_id ON tag(user_id);
CREATE INDEX IF NOT EXISTS idx_note_tag_note_id ON note_tag(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tag_tag_id ON note_tag(tag_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_note_search ON note USING GIN (
    to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);
