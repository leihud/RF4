CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipmentType TEXT NOT NULL,
  equipmentName TEXT NOT NULL,
  lockTension REAL DEFAULT 0,
  panelTension REAL DEFAULT 0,
  price REAL DEFAULT 0,
  UNIQUE(equipmentType, equipmentName)
);

CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipmentType);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(equipmentName);

CREATE TABLE IF NOT EXISTS rods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipmentName TEXT NOT NULL,
  equipmentType TEXT DEFAULT '鱼竿',
  category TEXT,
  subCategory TEXT,
  model TEXT NOT NULL,
  description TEXT,
  strengthKg TEXT,
  form TEXT,
  testG INTEGER DEFAULT 0,
  sensitivity INTEGER DEFAULT 0,
  hardness TEXT,
  levelReq TEXT,
  structure TEXT,
  ability TEXT,
  rating TEXT,
  weightG TEXT,
  adaptWeight TEXT,
  adaptWeightG INTEGER DEFAULT 0,
  goldPrice TEXT,
  silverPrice TEXT,
  lengthM TEXT,
  UNIQUE(model)
);

CREATE INDEX IF NOT EXISTS idx_rods_category ON rods(category);
CREATE INDEX IF NOT EXISTS idx_rods_model ON rods(model);

CREATE TABLE IF NOT EXISTS reels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipmentName TEXT NOT NULL,
  equipmentType TEXT DEFAULT '渔轮',
  category TEXT,
  subCategory TEXT,
  model TEXT NOT NULL,
  description TEXT,
  transmissionRatio TEXT,
  transmissionRatioStar TEXT,
  enginePower TEXT,
  lineSpeed TEXT,
  lineSpeedStar TEXT,
  size TEXT,
  form TEXT,
  frictionForce TEXT,
  frictionForceStar INTEGER DEFAULT 0,
  windingSpeed TEXT,
  test TEXT,
  testStar INTEGER DEFAULT 0,
  levelReq TEXT,
  spoolCapacity TEXT,
  obtainMethod TEXT,
  rating TEXT,
  adaptWeight TEXT,
  adaptWeightStar INTEGER DEFAULT 0,
  goldPrice TEXT,
  silverPrice TEXT,
  lockTension TEXT,
  lockTensionStar INTEGER DEFAULT 0,
  saltwaterResistant TEXT,
  UNIQUE(model)
);

CREATE INDEX IF NOT EXISTS idx_reels_category ON reels(category);
CREATE INDEX IF NOT EXISTS idx_reels_model ON reels(model);