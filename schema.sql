DO $remo$
BEGIN
CREATE TABLE IF NOT EXISTS public.remo_members (
  id integer PRIMARY KEY CHECK (id BETWEEN 1 AND 10),
  name text NOT NULL DEFAULT '', role text NOT NULL DEFAULT '',
  skills text NOT NULL DEFAULT '', public_contact text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.remo_projects (
  id integer PRIMARY KEY CHECK (id BETWEEN 1 AND 3),
  title text NOT NULL DEFAULT '', period text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '', participants text NOT NULL DEFAULT '',
  activities text NOT NULL DEFAULT '', process text NOT NULL DEFAULT '',
  results text NOT NULL DEFAULT '', image_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('active','completed','planned')),
  published boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.remo_page_content (
  page text NOT NULL, slot text NOT NULL, label text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '', image_url text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false, PRIMARY KEY (page, slot)
);
INSERT INTO public.remo_members(id,published)
SELECT n,true FROM generate_series(1,10) AS n ON CONFLICT DO NOTHING;
INSERT INTO public.remo_projects(id,status,published)
VALUES (1,'active',true),(2,'completed',true),(3,'planned',true) ON CONFLICT DO NOTHING;
INSERT INTO public.remo_page_content(page,slot,label,published) VALUES
('about','slot-01','페이지 소개 작성 공간',true),
('about','slot-02','팀 활동 이미지 삽입 공간',true),
('about','slot-03','팀 결성 배경과 소개 작성 공간',true),
('about','slot-04','비전과 목표 작성 공간',true),
('about','slot-05','주요 역량 작성 공간',true),
('about','slot-06','협업 방식 작성 공간',true),
('contact','slot-01','페이지 소개 작성 공간',true),
('contact','slot-02','대표 이메일 작성 공간',true),
('contact','slot-03','공식 채널 링크 작성 공간',true),
('contact','slot-04','팀 또는 공간 이미지 삽입 공간',true),
('index','slot-01','팀 대표 문구와 소개 작성 공간',true),
('index','slot-02','팀 대표 이미지 삽입 공간',true),
('index','slot-03','역량 아이콘 삽입 공간',true),
('index','slot-04','핵심 역량 1 제목과 설명 작성 공간',true),
('index','slot-05','역량 아이콘 삽입 공간',true),
('index','slot-06','핵심 역량 2 제목과 설명 작성 공간',true),
('index','slot-07','역량 아이콘 삽입 공간',true),
('index','slot-08','핵심 역량 3 제목과 설명 작성 공간',true),
('index','slot-09','주요 프로젝트 제목 작성 공간',true),
('privacy','slot-01','페이지 소개 작성 공간',true),
('projects','slot-01','페이지 소개 작성 공간',true),
('team','slot-01','페이지 소개 작성 공간',true),
('terms','slot-01','페이지 소개 작성 공간',true)
ON CONFLICT DO NOTHING;

END;
$remo$;
