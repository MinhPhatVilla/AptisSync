-- Copy và chạy đoạn mã này trong mục SQL Editor của Supabase để khởi tạo Database

CREATE TABLE public.user_state (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  schedule JSONB,
  schedule_date TIMESTAMP WITH TIME ZONE,
  blocks JSONB,
  active_block_index INT DEFAULT 0,
  time_left INT DEFAULT 0,
  end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT false,
  is_paused_day BOOLEAN DEFAULT false,
  stars INT DEFAULT 0,
  silver_stars INT DEFAULT 0,
  failed_days INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Dành cho Update (Nếu đã tạo bảng trước đó, hãy chạy riêng các dòng cần thiết)
-- ALTER TABLE public.user_state ADD COLUMN stars INT DEFAULT 0;
-- ALTER TABLE public.user_state ADD COLUMN failed_days INT DEFAULT 0;
-- ALTER TABLE public.user_state ADD COLUMN silver_stars INT DEFAULT 0;
-- ALTER TABLE public.user_state ADD COLUMN schedule_date TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE public.user_state ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;

-- Bật bảo mật RLS
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- Cấp quyền cho user chỉ được phép xem và sửa dữ liệu của chính mình
CREATE POLICY "Users can insert their own state" ON public.user_state FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can select their own state" ON public.user_state FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own state" ON public.user_state FOR UPDATE USING (auth.uid() = id);
