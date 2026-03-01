-- Copy và chạy đoạn mã này trong mục SQL Editor của Supabase để khởi tạo Database

CREATE TABLE public.user_state (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  schedule JSONB,
  blocks JSONB,
  active_block_index INT DEFAULT 0,
  time_left INT DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  is_paused_day BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Bật bảo mật RLS
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- Cấp quyền cho user chỉ được phép xem và sửa dữ liệu của chính mình
CREATE POLICY "Users can insert their own state" ON public.user_state FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can select their own state" ON public.user_state FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own state" ON public.user_state FOR UPDATE USING (auth.uid() = id);
