import bcrypt from 'bcryptjs';

export const categoriesData = [
  {
    name: 'Cement',
    slug: 'cement',
    description: 'OPC, PPC, and specialized construction cement from top-tier certified manufacturers.',
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    icon: 'Package',
    display_order: 1
  },
  {
    name: 'Steel & TMT Bars',
    slug: 'steel-tmt-bars',
    description: 'High-strength thermo-mechanically treated reinforcement rebars (Fe 500D, 550D).',
    image_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
    icon: 'Layers',
    display_order: 2
  },
  {
    name: 'Bricks & Blocks',
    slug: 'bricks-blocks',
    description: 'Red clay kiln bricks, lightweight AAC aerated blocks, and heavy concrete blocks.',
    image_url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80',
    icon: 'Grid',
    display_order: 3
  },
  {
    name: 'Sand & Aggregates',
    slug: 'sand-aggregates',
    description: 'River sand, manufactured M-sand for plastering, and crushed blue metal aggregates.',
    image_url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
    icon: 'Mountain',
    display_order: 4
  },
  {
    name: 'Tiles & Flooring',
    slug: 'tiles-flooring',
    description: 'Vitrified floor tiles, anti-skid ceramic tiles, granites, and installation adhesives.',
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    icon: 'LayoutGrid',
    display_order: 5
  },
  {
    name: 'Paints & Coatings',
    slug: 'paints-coatings',
    description: 'Interior & exterior weather-resistant emulsions, primers, and 2K waterproofing kits.',
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    icon: 'Paintbrush',
    display_order: 6
  },
  {
    name: 'Plumbing Materials',
    slug: 'plumbing-materials',
    description: 'CPVC, UPVC, and SWR pipes, brass fittings, heavy ball valves, and sanitary lines.',
    image_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
    icon: 'Wrench',
    display_order: 7
  },
  {
    name: 'Electrical Materials',
    slug: 'electrical-materials',
    description: 'FR copper multi-strand wiring cables, conduit pipes, modular switches, and MCB boards.',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    icon: 'Zap',
    display_order: 8
  },
  {
    name: 'Roofing Materials',
    slug: 'roofing-materials',
    description: 'Color-coated corrugated galvalume sheets, polycarbonate panels, and clay tiles.',
    image_url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=600&q=80',
    icon: 'Home',
    display_order: 9
  },
  {
    name: 'Tools & Equipment',
    slug: 'tools-equipment',
    description: 'Demolition rotary hammers, concrete mixers, spirit levels, trowels, and wheelbarrows.',
    image_url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
    icon: 'Hammer',
    display_order: 10
  }
];

export const serviceAreasData = [
  { postal_code: '110001', area_name: 'Connaught Place / Central Delhi', city: 'New Delhi', state: 'Delhi', is_serviceable: 1, estimated_days: 1, heavy_vehicle_allowed: 1, standard_shipping_fee: 200.00, free_delivery_threshold: 4000.00 },
  { postal_code: '201301', area_name: 'Noida Sector 1-18 Zone', city: 'Noida', state: 'Uttar Pradesh', is_serviceable: 1, estimated_days: 1, heavy_vehicle_allowed: 1, standard_shipping_fee: 180.00, free_delivery_threshold: 3500.00 },
  { postal_code: '560001', area_name: 'Bangalore Central (MG Road/Shivajinagar)', city: 'Bengaluru', state: 'Karnataka', is_serviceable: 1, estimated_days: 2, heavy_vehicle_allowed: 1, standard_shipping_fee: 250.00, free_delivery_threshold: 5000.00 },
  { postal_code: '400001', area_name: 'Fort / South Mumbai Industrial Core', city: 'Mumbai', state: 'Maharashtra', is_serviceable: 1, estimated_days: 2, heavy_vehicle_allowed: 0, standard_shipping_fee: 350.00, free_delivery_threshold: 6000.00 },
  { postal_code: '600001', area_name: 'George Town / Chennai Port Zone', city: 'Chennai', state: 'Tamil Nadu', is_serviceable: 1, estimated_days: 2, heavy_vehicle_allowed: 1, standard_shipping_fee: 240.00, free_delivery_threshold: 4500.00 },
  { postal_code: '500001', area_name: 'Abids / Hyderabad Central', city: 'Hyderabad', state: 'Telangana', is_serviceable: 1, estimated_days: 2, heavy_vehicle_allowed: 1, standard_shipping_fee: 220.00, free_delivery_threshold: 4500.00 },
  { postal_code: '700001', area_name: 'BBD Bagh / Central Commercial Core', city: 'Kolkata', state: 'West Bengal', is_serviceable: 1, estimated_days: 3, heavy_vehicle_allowed: 1, standard_shipping_fee: 300.00, free_delivery_threshold: 5500.00 }
];

export const couponsData = [
  {
    code: 'BUILD10',
    description: '10% instant discount on civil construction supplies up to ₹1,500',
    discount_type: 'percentage',
    discount_value: 10.00,
    min_order_amount: 3000.00,
    max_discount_amount: 1500.00,
    valid_from: '2025-01-01 00:00:00',
    valid_until: '2028-12-31 23:59:59',
    usage_limit: 1000,
    is_active: 1
  },
  {
    code: 'BULKPRO',
    description: 'Contractor Special: 15% off on high-volume purchases over ₹25,000 (Max ₹10,000)',
    discount_type: 'percentage',
    discount_value: 15.00,
    min_order_amount: 25000.00,
    max_discount_amount: 10000.00,
    valid_from: '2025-01-01 00:00:00',
    valid_until: '2028-12-31 23:59:59',
    usage_limit: 500,
    is_active: 1
  },
  {
    code: 'FIRSTBUY',
    description: 'Welcome to BuildMart! Flat ₹500 off on your inaugural order above ₹2,000',
    discount_type: 'flat',
    discount_value: 500.00,
    min_order_amount: 2000.00,
    max_discount_amount: 500.00,
    valid_from: '2025-01-01 00:00:00',
    valid_until: '2028-12-31 23:59:59',
    usage_limit: 5000,
    is_active: 1
  }
];

export const productsData = [
  // 1. CEMENT
  {
    category_slug: 'cement',
    name: 'UltraTech Super OPC 53 Grade Cement',
    slug: 'ultratech-super-opc-53-grade-cement-50kg',
    sku: 'CEM-ULT-53-01',
    brand: 'UltraTech',
    description: 'High-strength Ordinary Portland Cement (OPC 53 Grade) engineered for heavy-duty structural concrete, columns, slabs, and bridges. Conforms to IS 269:2015 with micro-fine particles providing exceptional compressive strength.',
    unit_of_measure: 'bag (50kg)',
    unit_price: 395.00,
    discount_percent: 5.00,
    stock_quantity: 450,
    low_stock_threshold: 50,
    min_order_quantity: 5,
    volume_discount_threshold: 50,
    volume_discount_percent: 8.00,
    is_heavy_bulk: 1,
    rating: 4.85,
    review_count: 42,
    images: [
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      grade: 'OPC 53',
      standard: 'IS 269:2015',
      weight_per_bag: '50 kg',
      setting_time_initial: '30 mins minimum',
      setting_time_final: '600 mins maximum',
      packaging: 'HDPE Laminated Bag'
    }
  },
  {
    category_slug: 'cement',
    name: 'Ambuja Plus Roof Special Blended Cement',
    slug: 'ambuja-plus-roof-special-blended-cement-50kg',
    sku: 'CEM-AMB-RS-02',
    brand: 'Ambuja',
    description: 'Formulated with specialized surface-active plasticizing agents for dense, waterproof concrete. Specifically designed to prevent roof slab seepage, corrosion of rebars, and hairline fissures.',
    unit_of_measure: 'bag (50kg)',
    unit_price: 410.00,
    discount_percent: 4.00,
    stock_quantity: 320,
    low_stock_threshold: 40,
    min_order_quantity: 5,
    volume_discount_threshold: 40,
    volume_discount_percent: 7.50,
    is_heavy_bulk: 1,
    rating: 4.90,
    review_count: 28,
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      type: 'Portland Composite / Roof Special',
      standard: 'IS 16415:2015',
      weight: '50 kg',
      water_repellency: 'Hydrophobic active barrier'
    }
  },

  // 2. STEEL & TMT
  {
    category_slug: 'steel-tmt-bars',
    name: 'Tata Tiscon 550D High-Ductility TMT Rebars (12mm)',
    slug: 'tata-tiscon-550d-tmt-rebars-12mm',
    sku: 'STL-TAT-12MM-01',
    brand: 'Tata Tiscon',
    description: 'Premium Fe 550D thermo-mechanically treated rebars offering superior earthquake resistance and remarkable bendability. Primary choice for beams, heavy lintels, and structural foundations.',
    unit_of_measure: 'piece (12m)',
    unit_price: 940.00,
    discount_percent: 3.50,
    stock_quantity: 600,
    low_stock_threshold: 60,
    min_order_quantity: 10,
    volume_discount_threshold: 80,
    volume_discount_percent: 6.00,
    is_heavy_bulk: 1,
    rating: 4.92,
    review_count: 57,
    images: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      diameter: '12 mm',
      length_per_bar: '12 meters (~40 ft)',
      steel_grade: 'Fe 550D',
      yield_strength: '550 N/mm² min',
      elongation: '16.0% min',
      standard: 'IS 1786:2008'
    }
  },
  {
    category_slug: 'steel-tmt-bars',
    name: 'JSW Neosteel Fe 500D Structural TMT Rebar (16mm)',
    slug: 'jsw-neosteel-fe-500d-tmt-16mm',
    sku: 'STL-JSW-16MM-02',
    brand: 'JSW',
    description: 'Pure iron ore virgin steel TMT rebars with low phosphorus and sulfur levels. Exceptional tensile strength for multi-story load-bearing pillars and bridge flyover columns.',
    unit_of_measure: 'piece (12m)',
    unit_price: 1680.00,
    discount_percent: 5.00,
    stock_quantity: 380,
    low_stock_threshold: 40,
    min_order_quantity: 5,
    volume_discount_threshold: 50,
    volume_discount_percent: 7.00,
    is_heavy_bulk: 1,
    rating: 4.78,
    review_count: 31,
    images: [
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      diameter: '16 mm',
      length: '12 meters',
      grade: 'Fe 500D',
      weight_per_meter: '~1.58 kg/m'
    }
  },

  // 3. BRICKS & BLOCKS
  {
    category_slug: 'bricks-blocks',
    name: 'Red Clay Kiln-Fired First Class Construction Bricks',
    slug: 'red-clay-kiln-fired-first-class-bricks',
    sku: 'BRK-CLY-001',
    brand: 'BuildMart Earth',
    description: 'High-temperature kiln burnt red clay bricks with sharp uniform edges, deep ringing metallic sound, and minimal water absorption (<15%). Suitable for all load-bearing masonry walls.',
    unit_of_measure: 'piece',
    unit_price: 11.50,
    discount_percent: 0.00,
    stock_quantity: 12000,
    low_stock_threshold: 2000,
    min_order_quantity: 500,
    volume_discount_threshold: 2000,
    volume_discount_percent: 8.00,
    is_heavy_bulk: 1,
    rating: 4.65,
    review_count: 89,
    images: [
      'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      dimensions: '9" x 4.25" x 2.75"',
      crushing_strength: '10.5 N/mm²',
      water_absorption: '< 15% by dry weight',
      efflorescence: 'Nil to slight'
    }
  },
  {
    category_slug: 'bricks-blocks',
    name: 'Aerocon Lightweight AAC Autoclaved Concrete Blocks',
    slug: 'aerocon-lightweight-aac-blocks-600x200x150',
    sku: 'BLK-AAC-600-02',
    brand: 'Aerocon',
    description: 'Thermal insulating, fire-resistant autoclaved aerated concrete blocks. Reduces structural dead-weight by 50%, saving reinforcement steel and mortar costs.',
    unit_of_measure: 'piece',
    unit_price: 88.00,
    discount_percent: 6.00,
    stock_quantity: 1400,
    low_stock_threshold: 200,
    min_order_quantity: 50,
    volume_discount_threshold: 300,
    volume_discount_percent: 9.00,
    is_heavy_bulk: 1,
    rating: 4.82,
    review_count: 36,
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      size: '600mm x 200mm x 150mm',
      density: '550 - 650 kg/m³',
      compressive_strength: '3.5 - 4.0 N/mm²',
      fire_rating: 'Up to 4 hours'
    }
  },

  // 4. SAND & AGGREGATES
  {
    category_slug: 'sand-aggregates',
    name: 'Washed Zone II M-Sand (Manufactured Plastering Sand)',
    slug: 'washed-zone-ii-manufactured-plastering-sand-cft',
    sku: 'SND-MSD-01',
    brand: 'BuildMart Aggregate',
    description: 'Triple-washed manufactured sand with zero silt content and optimal fineness modulus. Perfect replacement for natural river sand, delivering high bonding strength in plaster and bricklaying.',
    unit_of_measure: 'cubic feet',
    unit_price: 52.00,
    discount_percent: 0.00,
    stock_quantity: 3500,
    low_stock_threshold: 500,
    min_order_quantity: 100,
    volume_discount_threshold: 500,
    volume_discount_percent: 5.00,
    is_heavy_bulk: 1,
    rating: 4.70,
    review_count: 24,
    images: [
      'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      grading: 'IS 383 Zone II',
      silt_content: '< 1.5%',
      source: 'Crushed hard granite boulder',
      delivery_mode: 'Dump truck / Tipper'
    }
  },
  {
    category_slug: 'sand-aggregates',
    name: '20mm Blue Metal Granite Coarse Concrete Aggregate',
    slug: '20mm-blue-metal-granite-coarse-aggregate-cft',
    sku: 'AGG-BLU-20MM-02',
    brand: 'BuildMart Aggregate',
    description: 'Angular machine-crushed 20mm blue granite aggregate with high crushing value and minimal elongation index. Essential coarse aggregate for reinforced cement concrete (RCC) mixes.',
    unit_of_measure: 'cubic feet',
    unit_price: 48.00,
    discount_percent: 0.00,
    stock_quantity: 4000,
    low_stock_threshold: 600,
    min_order_quantity: 100,
    volume_discount_threshold: 500,
    volume_discount_percent: 5.00,
    is_heavy_bulk: 1,
    rating: 4.88,
    review_count: 19,
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      size: '20 mm nominal single-sized',
      shape: 'Cubical angular',
      rock_type: 'Natural Blue Granite'
    }
  },

  // 5. TILES & FLOORING
  {
    category_slug: 'tiles-flooring',
    name: 'Kajaria Eternity Polished Vitrified Floor Tiles (600x600mm)',
    slug: 'kajaria-eternity-polished-vitrified-floor-tiles-600x600',
    sku: 'TIL-KAJ-600-01',
    brand: 'Kajaria',
    description: 'High-gloss Italian statuario marble finish glazed vitrified floor tiles with nano-coat stain resistance. Scratch proof and suitable for heavy residential and commercial foot traffic.',
    unit_of_measure: 'box (4 pieces / 15.5 sq ft)',
    unit_price: 840.00,
    discount_percent: 12.00,
    stock_quantity: 180,
    low_stock_threshold: 25,
    min_order_quantity: 2,
    volume_discount_threshold: 20,
    volume_discount_percent: 7.00,
    is_heavy_bulk: 0,
    rating: 4.80,
    review_count: 53,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      tile_size: '600 x 600 mm (2x2 ft)',
      finish: 'High Gloss Polished',
      coverage_per_box: '15.5 sq. ft. (1.44 sq. m.)',
      water_absorption: '< 0.05%'
    }
  },

  // 6. PAINTS & COATINGS
  {
    category_slug: 'paints-coatings',
    name: 'Asian Paints Apex Ultima Weatherproof Exterior Emulsion (20L)',
    slug: 'asian-paints-apex-ultima-exterior-emulsion-20l',
    sku: 'PNT-AP-ULT-20L',
    brand: 'Asian Paints',
    description: 'High-performance water-based exterior wall finish with silicone additives and dirt pick-up resistance. Protects against heavy rains, algae, fungus, and extreme solar UV radiation.',
    unit_of_measure: 'drum (20 Litre)',
    unit_price: 4950.00,
    discount_percent: 10.00,
    stock_quantity: 95,
    low_stock_threshold: 15,
    min_order_quantity: 1,
    volume_discount_threshold: 5,
    volume_discount_percent: 6.00,
    is_heavy_bulk: 0,
    rating: 4.91,
    review_count: 64,
    images: [
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      volume: '20 Litres',
      finish: 'Sheen',
      coverage: '55-60 sq ft/litre for 2 coats',
      warranty: '7-year performance warranty'
    }
  },
  {
    category_slug: 'paints-coatings',
    name: 'Dr. Fixit Dampguard 2K Waterproof Coating (5kg Pack)',
    slug: 'dr-fixit-dampguard-2k-waterproofing-5kg',
    sku: 'PNT-DRF-2K-05',
    brand: 'Dr. Fixit',
    description: 'Two-component acrylic polymer modified cementitious coating for positive and negative side waterproofing of water tanks, sunken slabs, basements, and retaining walls.',
    unit_of_measure: 'pack (5kg kit)',
    unit_price: 1120.00,
    discount_percent: 8.00,
    stock_quantity: 140,
    low_stock_threshold: 20,
    min_order_quantity: 1,
    volume_discount_threshold: 10,
    volume_discount_percent: 5.00,
    is_heavy_bulk: 0,
    rating: 4.75,
    review_count: 38,
    images: [
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      type: '2-Component Cementitious Polymer',
      application: 'Brush applied',
      coverage: '15-20 sq ft/kg for 2 coats'
    }
  },

  // 7. PLUMBING MATERIALS
  {
    category_slug: 'plumbing-materials',
    name: 'Finolex Heavy Duty CPVC Plumbing Pipe (1 Inch, 3m)',
    slug: 'finolex-heavy-duty-cpvc-pipe-1-inch-3m',
    sku: 'PLM-FIN-CPVC-1IN',
    brand: 'Finolex',
    description: 'Chlorinated Polyvinyl Chloride (CPVC) pipe rated for hot and cold potable water distribution up to 93°C. Non-corrosive, bacteriologically neutral, and chemical resistant.',
    unit_of_measure: 'piece (3m length)',
    unit_price: 360.00,
    discount_percent: 7.00,
    stock_quantity: 320,
    low_stock_threshold: 40,
    min_order_quantity: 3,
    volume_discount_threshold: 25,
    volume_discount_percent: 6.50,
    is_heavy_bulk: 0,
    rating: 4.79,
    review_count: 41,
    images: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      diameter: '1 inch (25mm)',
      length: '3 meters (10 ft)',
      standard: 'IS 15778 / ASTM D2846 SDR 11',
      max_temperature: '93°C'
    }
  },

  // 8. ELECTRICAL MATERIALS
  {
    category_slug: 'electrical-materials',
    name: 'Havells Life Line Plus FR Flame-Retardant Copper Cable (2.5 sq mm)',
    slug: 'havells-life-line-plus-fr-copper-cable-2-5-sqmm',
    sku: 'ELE-HAV-2.5-90M',
    brand: 'Havells',
    description: 'Single core multi-strand unsheathed bright annealed electrolytic grade copper conductor insulated with flame retardant (FR) grade PVC. Conforms to IS 694 standards.',
    unit_of_measure: 'coil (90 meters)',
    unit_price: 2480.00,
    discount_percent: 11.00,
    stock_quantity: 110,
    low_stock_threshold: 15,
    min_order_quantity: 1,
    volume_discount_threshold: 10,
    volume_discount_percent: 8.00,
    is_heavy_bulk: 0,
    rating: 4.88,
    review_count: 73,
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      conductor_size: '2.5 sq. mm',
      length: '90 meters box',
      insulation: 'Flame Retardant (FR) PVC',
      voltage_grade: '1100V'
    }
  },

  // 9. ROOFING MATERIALS
  {
    category_slug: 'roofing-materials',
    name: 'Tata Bluescope Colorbond Corrugated Roofing Sheet (12ft x 3.5ft)',
    slug: 'tata-bluescope-corrugated-roofing-sheet-12ft',
    sku: 'ROF-TAT-BLU-12FT',
    brand: 'Tata Bluescope',
    description: 'Galvalume alloy steel pre-painted roofing profile sheets featuring high corrosion resistance, aesthetic color coating, and excellent structural load handling.',
    unit_of_measure: 'sheet (12ft)',
    unit_price: 1350.00,
    discount_percent: 4.00,
    stock_quantity: 150,
    low_stock_threshold: 20,
    min_order_quantity: 4,
    volume_discount_threshold: 20,
    volume_discount_percent: 6.00,
    is_heavy_bulk: 1,
    rating: 4.74,
    review_count: 22,
    images: [
      'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      sheet_length: '12 feet (3.66m)',
      effective_width: '3.5 feet (1060mm)',
      thickness: '0.50 mm TCT',
      coating: 'AZ150 Metallic Coating'
    }
  },

  // 10. TOOLS & EQUIPMENT
  {
    category_slug: 'tools-equipment',
    name: 'Bosch GBH 2-26 DRE Professional 800W Rotary Hammer Drill',
    slug: 'bosch-gbh-2-26-dre-professional-rotary-hammer-drill',
    sku: 'TOL-BOS-GBH-800W',
    brand: 'Bosch',
    description: 'Industrial 800-watt hammer drill with 2.7 Joules impact energy. Three operating modes: drilling, hammer drilling, and chiseling for solid concrete and masonry wall channels.',
    unit_of_measure: 'kit / box',
    unit_price: 6850.00,
    discount_percent: 15.00,
    stock_quantity: 45,
    low_stock_threshold: 8,
    min_order_quantity: 1,
    volume_discount_threshold: 4,
    volume_discount_percent: 8.00,
    is_heavy_bulk: 0,
    rating: 4.94,
    review_count: 112,
    images: [
      'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      power_input: '800 Watts',
      impact_energy: '2.7 Joules',
      max_concrete_drilling: '26 mm',
      tool_holder: 'SDS-Plus chuck'
    }
  },
  {
    category_slug: 'tools-equipment',
    name: 'Heavy Duty 100L Construction Site Steel Wheelbarrow',
    slug: 'heavy-duty-100l-construction-steel-wheelbarrow',
    sku: 'TOL-WHL-100L-01',
    brand: 'BuildMart Equip',
    description: 'Thick gauge cold-rolled steel tray with heavy-duty tubular steel handles and 16-inch pneumatic tire with ball bearings. Designed for transporting wet concrete, sand, and mortar.',
    unit_of_measure: 'piece',
    unit_price: 3200.00,
    discount_percent: 5.00,
    stock_quantity: 35,
    low_stock_threshold: 6,
    min_order_quantity: 1,
    volume_discount_threshold: 5,
    volume_discount_percent: 7.00,
    is_heavy_bulk: 1,
    rating: 4.67,
    review_count: 18,
    images: [
      'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: {
      tray_capacity: '100 Litres (water) / 180 kg payload',
      sheet_thickness: '1.2 mm deep drawn steel',
      wheel: '16" 4-ply pneumatic rubber tire'
    }
  }
];
