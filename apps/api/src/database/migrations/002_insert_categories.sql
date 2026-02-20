-- Insert category data
INSERT INTO categories (code, name_en, name_hi, parent_id) VALUES
-- School Categories
('school_1_5', 'Class 1-5', 'कक्षा 1-5', NULL),
('school_6_8', 'Class 6-8', 'कक्षा 6-8', NULL),
('school_9_10', 'Class 9-10', 'कक्षा 9-10', NULL),
('school_11_12_science', 'Class 11-12 Science', 'कक्षा 11-12 विज्ञान', NULL),
('school_11_12_commerce', 'Class 11-12 Commerce', 'कक्षा 11-12 वाणिज्य', NULL),
('school_11_12_arts', 'Class 11-12 Arts', 'कक्षा 11-12 कला', NULL),

-- College Categories
('college_ba', 'BA (Bachelor of Arts)', 'बीए (कला स्नातक)', NULL),
('college_bsc', 'BSc (Bachelor of Science)', 'बीएससी (विज्ञान स्नातक)', NULL),
('college_bcom', 'BCom (Bachelor of Commerce)', 'बीकॉम (वाणिज्य स्नातक)', NULL),
('college_bba', 'BBA (Bachelor of Business Administration)', 'बीबीए (व्यवसाय प्रशासन स्नातक)', NULL),
('college_bca', 'BCA (Bachelor of Computer Applications)', 'बीसीए (कंप्यूटर अनुप्रयोग स्नातक)', NULL),
('college_btech', 'BTech (Bachelor of Technology)', 'बीटेक (प्रौद्योगिकी स्नातक)', NULL),
('college_mba', 'MBA (Master of Business Administration)', 'एमबीए (व्यवसाय प्रशासन में स्नातकोत्तर)', NULL),
('college_law', 'Law', 'कानून', NULL),
('college_medical', 'Medical', 'चिकित्सा', NULL),
('college_pharmacy', 'Pharmacy', 'फार्मेसी', NULL),

-- Competitive Exam Categories
('competitive_upsc', 'UPSC', 'यूपीएससी', NULL),
('competitive_ssc', 'SSC', 'एसएससी', NULL),
('competitive_banking', 'Banking', 'बैंकिंग', NULL),
('competitive_railways', 'Railways', 'रेलवे', NULL),
('competitive_defence', 'Defence', 'रक्षा', NULL),
('competitive_state', 'State PCS', 'राज्य पीसीएस', NULL)
ON CONFLICT (code) DO NOTHING;
