-- Granular service catalog: add grouping + billing-unit metadata to crm.services,
-- then seed a typical web-agency catalog. Prices are editable DEFAULTS — per-invoice
-- line items can still override any price/qty/description.
alter table crm.services
  add column if not exists category    text,
  add column if not exists subcategory text,
  add column if not exists unit        text,
  add column if not exists sort_order  integer not null default 0;

create index if not exists idx_services_category on crm.services(category, sort_order);

-- Seed only when the catalog is empty, so re-running the migration is safe.
insert into crm.services
  (name, category, subcategory, unit, default_unit_price_cents, default_quantity, taxable, sort_order)
select * from (values
  -- 1. Hosting & Infrastructure
  ('Shared Web Hosting','Hosting & Infrastructure','Web Hosting','month',1500,1,false,10),
  ('Managed WordPress Hosting','Hosting & Infrastructure','Web Hosting','month',3500,1,false,20),
  ('VPS / Cloud Hosting','Hosting & Infrastructure','Web Hosting','month',6000,1,false,30),
  ('Static / JAMstack Hosting','Hosting & Infrastructure','Web Hosting','month',2000,1,false,40),
  ('Domain Registration (.com)','Hosting & Infrastructure','Domains','year',2000,1,false,50),
  ('Premium / Specialty TLD','Hosting & Infrastructure','Domains','year',4000,1,false,60),
  ('Domain Transfer','Hosting & Infrastructure','Domains','one-time',2000,1,false,70),
  ('Domain Privacy Protection','Hosting & Infrastructure','Domains','year',1200,1,false,80),
  ('DNS Management','Hosting & Infrastructure','Domains','year',3000,1,false,90),
  ('Additional Storage (per 10 GB)','Hosting & Infrastructure','Server Resources','month',1000,1,false,100),
  ('Dedicated IP Address','Hosting & Infrastructure','Server Resources','month',500,1,false,110),
  ('CDN Service','Hosting & Infrastructure','Server Resources','month',2000,1,false,120),
  ('Professional Email Mailbox','Hosting & Infrastructure','Email Hosting','month',600,1,false,130),
  ('Google Workspace Seat','Hosting & Infrastructure','Email Hosting','month',700,1,false,140),
  ('Email Migration (per mailbox)','Hosting & Infrastructure','Email Hosting','one-time',2500,1,false,150),
  ('SSL Certificate Setup','Hosting & Infrastructure','SSL','one-time',5000,1,false,160),
  ('Wildcard SSL Certificate','Hosting & Infrastructure','SSL','year',15000,1,false,170),
  -- 2. Maintenance & Support
  ('Essential Care Plan','Maintenance & Support','Care Plans','month',10000,1,false,180),
  ('Standard Care Plan','Maintenance & Support','Care Plans','month',15000,1,false,190),
  ('Premium Care Plan','Maintenance & Support','Care Plans','month',25000,1,false,200),
  ('Daily Automated Backups','Maintenance & Support','Backups','month',1500,1,false,210),
  ('Off-site Backup Storage','Maintenance & Support','Backups','month',1000,1,false,220),
  ('On-demand Backup & Restore','Maintenance & Support','Backups','one-time',7500,1,false,230),
  ('CMS & Plugin Updates','Maintenance & Support','Updates & Monitoring','month',4000,1,false,240),
  ('Uptime Monitoring','Maintenance & Support','Updates & Monitoring','month',1000,1,false,250),
  ('Support Retainer','Maintenance & Support','Support','hour',9500,1,false,260),
  ('Emergency / After-Hours Support','Maintenance & Support','Support','hour',15000,1,false,270),
  -- 3. Security
  ('Malware Scan & Removal','Security',null,'one-time',15000,1,false,280),
  ('Web Application Firewall (WAF)','Security',null,'month',2000,1,false,290),
  ('Security Hardening','Security',null,'one-time',20000,1,false,300),
  ('Security Audit','Security',null,'one-time',35000,1,false,310),
  ('Two-Factor / Access Setup','Security',null,'one-time',7500,1,false,320),
  -- 4. Design & Development
  ('Single Landing Page','Design & Development','Website Builds','one-time',60000,1,false,330),
  ('Brochure Website (up to 5 pages)','Design & Development','Website Builds','one-time',180000,1,false,340),
  ('Business Website (up to 10 pages)','Design & Development','Website Builds','one-time',350000,1,false,350),
  ('E-commerce Website','Design & Development','Website Builds','one-time',550000,1,false,360),
  ('Custom Web Application (starting)','Design & Development','Website Builds','one-time',800000,1,false,370),
  ('Additional Web Page','Design & Development','Pages & Templates','page',25000,1,false,380),
  ('Custom Page Template','Design & Development','Pages & Templates','one-time',40000,1,false,390),
  ('Contact / Custom Form','Design & Development','Features','one-time',15000,1,false,400),
  ('API / Third-Party Integration','Design & Development','Features','one-time',50000,1,false,410),
  ('Custom Feature / Functionality','Design & Development','Features','hour',11000,1,false,420),
  ('CMS Setup (WordPress)','Design & Development','CMS & E-commerce','one-time',40000,1,false,430),
  ('E-commerce Store Setup','Design & Development','CMS & E-commerce','one-time',120000,1,false,440),
  ('Product Upload (per 25)','Design & Development','CMS & E-commerce','each',15000,1,false,450),
  ('Payment Gateway Integration','Design & Development','CMS & E-commerce','one-time',25000,1,false,460),
  -- 5. Branding & Creative
  ('Logo Design','Branding & Creative',null,'one-time',45000,1,false,470),
  ('Brand Identity Package','Branding & Creative',null,'one-time',120000,1,false,480),
  ('Brand Style Guide','Branding & Creative',null,'one-time',50000,1,false,490),
  ('Business Card / Print Design','Branding & Creative',null,'one-time',15000,1,false,500),
  ('Social Media Graphics Pack','Branding & Creative',null,'one-time',25000,1,false,510),
  -- 6. Content & Copywriting
  ('Website Copywriting','Content & Copywriting',null,'page',12000,1,false,520),
  ('Blog Post / Article (up to 800 words)','Content & Copywriting',null,'each',15000,1,false,530),
  ('Product Descriptions (per 10)','Content & Copywriting',null,'each',12000,1,false,540),
  ('Copy Editing & Proofreading','Content & Copywriting',null,'hour',6500,1,false,550),
  -- 7. SEO & Marketing
  ('SEO Audit','SEO & Marketing','SEO','one-time',35000,1,false,560),
  ('On-Page SEO','SEO & Marketing','SEO','page',7500,1,false,570),
  ('Technical SEO','SEO & Marketing','SEO','one-time',40000,1,false,580),
  ('Local SEO Setup (Google Business Profile)','SEO & Marketing','SEO','one-time',30000,1,false,590),
  ('Keyword Research','SEO & Marketing','SEO','one-time',20000,1,false,600),
  ('Monthly SEO Retainer','SEO & Marketing','SEO','month',50000,1,false,610),
  ('Analytics Setup (GA4)','SEO & Marketing','Analytics','one-time',15000,1,false,620),
  ('Conversion / Event Tracking','SEO & Marketing','Analytics','one-time',20000,1,false,630),
  ('Monthly Performance Report','SEO & Marketing','Analytics','month',10000,1,false,640),
  ('Google Ads Management','SEO & Marketing','Paid & Email','month',40000,1,false,650),
  ('Ad Campaign Setup','SEO & Marketing','Paid & Email','one-time',30000,1,false,660),
  ('Email Marketing Setup','SEO & Marketing','Paid & Email','one-time',25000,1,false,670),
  -- 8. Performance & Optimization
  ('Speed / Page Load Optimization','Performance & Optimization',null,'one-time',30000,1,false,680),
  ('Image Optimization','Performance & Optimization',null,'one-time',12000,1,false,690),
  ('Core Web Vitals Optimization','Performance & Optimization',null,'one-time',35000,1,false,700),
  ('Caching Configuration','Performance & Optimization',null,'one-time',15000,1,false,710),
  -- 9. Media & Assets
  ('Stock Photography (per image)','Media & Assets',null,'each',1500,1,false,720),
  ('Custom Photography (per session)','Media & Assets',null,'each',40000,1,false,730),
  ('Video Editing','Media & Assets',null,'hour',9000,1,false,740),
  ('Custom Icons / Illustrations','Media & Assets',null,'each',7500,1,false,750),
  -- 10. Consulting & Project
  ('Discovery / Strategy Session','Consulting & Project',null,'one-time',20000,1,false,760),
  ('Consulting','Consulting & Project',null,'hour',12500,1,false,770),
  ('Training Session','Consulting & Project',null,'hour',9000,1,false,780),
  ('Website Migration','Consulting & Project',null,'one-time',40000,1,false,790),
  ('Rush / Expedite Fee','Consulting & Project',null,'one-time',25000,1,false,800)
) as seed(name, category, subcategory, unit, default_unit_price_cents, default_quantity, taxable, sort_order)
where not exists (select 1 from crm.services);
