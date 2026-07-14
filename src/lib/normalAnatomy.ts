// MRI Normal Anatomy Description Templates
// Each body region contains an array of AnatomyItem objects describing normal findings.
// Individual items can be selectively excluded when building report text.

export interface AnatomyItem {
  key: string; // unique key e.g. "brain_parenchyma"
  label: string; // display label e.g. "Brain Parenchyma"
  text: string; // normal description text
}

export const NORMAL_ANATOMY: Record<string, AnatomyItem[]> = {
  // ──────────────────────────────────────────────
  // BRAIN
  // ──────────────────────────────────────────────
  Brain: [
    {
      key: "brain_parenchyma",
      label: "Brain Parenchyma",
      text: "Brain parenchyma demonstrates normal signal intensity on all sequences with no area of abnormal signal alteration. No parenchymal volume loss.",
    },
    {
      key: "brain_ventricles",
      label: "Ventricles",
      text: "The lateral, third, and fourth ventricles are normal in size and configuration. No ventriculomegaly or shift of midline structures.",
    },
    {
      key: "brain_extra_axial",
      label: "Extra-Axial Spaces",
      text: "Extra-axial CSF spaces are normal in caliber. No extra-axial fluid collection is identified.",
    },
    {
      key: "brain_sella",
      label: "Sella",
      text: "The sella turcica is normal in size. The pituitary gland is normal in size and signal intensity with a flat superior margin. The pituitary stalk is midline and normal in caliber. The optic chiasm is unremarkable.",
    },
    {
      key: "brain_posterior_fossa",
      label: "Posterior Fossa",
      text: "Posterior fossa structures are normal. The cerebellum and brainstem demonstrate normal signal intensity and morphology. The cerebellopontine angles are symmetric and clear. Basilar cisterns are patent.",
    },
    {
      key: "brain_major_vessels",
      label: "Major Vessels",
      text: "Major intracranial vascular flow voids are preserved. The circle of Willis is intact and normal in caliber.",
    },
    {
      key: "brain_cavernous_sinuses",
      label: "Cavernous Sinuses",
      text: "The cavernous sinuses are symmetric in size and signal intensity with no abnormal enhancement or filling defect.",
    },
    {
      key: "brain_orbits",
      label: "Orbits",
      text: "Orbits are unremarkable bilaterally. The globes, extraocular muscles, optic nerves, and retro-orbital fat are normal.",
    },
    {
      key: "brain_paranasal_sinuses",
      label: "Paranasal Sinuses",
      text: "Paranasal sinuses are clear. The nasal cavity is unremarkable.",
    },
    {
      key: "brain_mastoid_air_cells",
      label: "Mastoid Air Cells",
      text: "Mastoid air cells are well-aerated bilaterally with no fluid or soft tissue opacity.",
    },
  ],

  // ──────────────────────────────────────────────
  // SPINE – CERVICAL
  // ──────────────────────────────────────────────
  "Spine - Cervical": [
    {
      key: "cspine_alignment",
      label: "Vertebral Alignment",
      text: "Normal cervical lordosis is maintained. No vertebral subluxation or malalignment is identified. No spondylolisthesis.",
    },
    {
      key: "cspine_vertebral_bodies",
      label: "Vertebral Body Heights & Marrow Signal",
      text: "Cervical vertebral body heights are preserved. Vertebral body marrow signal is normal without evidence of compressive deformity, fracture, or marrow-replacing process.",
    },
    {
      key: "cspine_prevertebral_space",
      label: "Prevertebral Space",
      text: "The prevertebral soft tissues are normal in thickness with no prevertebral edema or fluid collection.",
    },
    {
      key: "cspine_disc_spaces",
      label: "Disc Spaces",
      text: "Disc spaces are normal in height and signal intensity from C2-C3 through C7-T1. No disc herniation, bulge, or annular fissure is identified. No disc desiccation.",
    },
    {
      key: "cspine_spinal_cord",
      label: "Spinal Cord",
      text: "The cervical spinal cord is normal in caliber and signal intensity. No intramedullary lesion, syrinx, or myelomalacia is identified.",
    },
    {
      key: "cspine_nerve_roots",
      label: "Nerve Roots",
      text: "Cervical nerve roots are normal in caliber bilaterally with no compression or foraminal stenosis at any level.",
    },
    {
      key: "cspine_paraspinal_soft_tissues",
      label: "Paraspinal Soft Tissues",
      text: "Paraspinal soft tissues are normal with no abnormal soft tissue mass or fluid collection.",
    },
  ],

  // ──────────────────────────────────────────────
  // SPINE – LUMBAR
  // ──────────────────────────────────────────────
  "Spine - Lumbar": [
    {
      key: "lspine_alignment",
      label: "Vertebral Alignment",
      text: "Normal lumbar lordosis is maintained. No vertebral subluxation, spondylolisthesis, or malalignment is identified.",
    },
    {
      key: "lspine_vertebral_bodies",
      label: "Vertebral Body Heights & Marrow Signal",
      text: "Lumbar vertebral body heights are preserved from L1 through S1. Vertebral body marrow signal is normal. No compression fracture, marrow-replacing process, or suspicious lesion is identified.",
    },
    {
      key: "lspine_disc_spaces",
      label: "Disc Spaces",
      text: "Lumbar disc spaces are normal in height and signal intensity from L1-L2 through L5-S1. No disc herniation, protrusion, extrusion, or annular fissure is identified.",
    },
    {
      key: "lspine_conus_medullaris",
      label: "Conus Medullaris",
      text: "The conus medullaris terminates at a normal level and is normal in signal intensity. No tethering or intramedullary lesion is identified.",
    },
    {
      key: "lspine_cauda_equina",
      label: "Cauda Equina",
      text: "The cauda equina nerve roots are normal in caliber and distribution within the thecal sac with no clumping or abnormal enhancement.",
    },
    {
      key: "lspine_nerve_roots",
      label: "Nerve Roots",
      text: "Lumbar nerve roots are normal in caliber bilaterally with no foraminal stenosis or nerve root compression at any level.",
    },
    {
      key: "lspine_facet_joints",
      label: "Facet Joints",
      text: "Facet joints are normal in alignment and signal intensity at all visualized levels. No facet joint hypertrophy, arthropathy, or effusion is identified.",
    },
    {
      key: "lspine_paraspinal_soft_tissues",
      label: "Paraspinal Soft Tissues",
      text: "Paraspinal soft tissues are unremarkable. No paraspinal mass, fluid collection, or abnormal soft tissue is identified.",
    },
  ],

  // ──────────────────────────────────────────────
  // KNEE
  // ──────────────────────────────────────────────
  Knee: [
    {
      key: "knee_menisci",
      label: "Menisci",
      text: "The medial and lateral menisci are normal in morphology and signal intensity. No meniscal tear, degeneration, or meniscal cyst is identified.",
    },
    {
      key: "knee_cruciate_ligaments",
      label: "Cruciate Ligaments",
      text: "The anterior and posterior cruciate ligaments are intact and normal in signal intensity. No partial or complete tear is identified.",
    },
    {
      key: "knee_collateral_ligaments",
      label: "Collateral Ligaments",
      text: "The medial collateral ligament and lateral collateral ligament complex (including the iliotibial band and popliteofibular ligament) are intact and normal.",
    },
    {
      key: "knee_extensor_mechanism",
      label: "Extensor Mechanism",
      text: "The quadriceps tendon and patellar ligament are intact with normal signal intensity and thickness. The patella is normal in position and signal.",
    },
    {
      key: "knee_cartilage",
      label: "Articular Cartilage",
      text: "Articular cartilage of the femoral condyles, tibial plateau, and patellofemoral compartment demonstrates normal thickness and signal intensity without fissuring or focal defect.",
    },
    {
      key: "knee_bone_marrow",
      label: "Bone Marrow",
      text: "Bone marrow signal of the distal femur, proximal tibia, and patella is normal without evidence of occult fracture, bone bruise, avascular necrosis, or marrow-replacing lesion.",
    },
    {
      key: "knee_synovium",
      label: "Synovium",
      text: "No significant joint effusion is present. Synovium is normal with no synovial thickening, pannus, or loose body.",
    },
    {
      key: "knee_popliteal_fossa",
      label: "Popliteal Fossa",
      text: "The popliteal fossa is unremarkable. No Baker cyst, popliteal artery aneurysm, or mass is identified.",
    },
  ],

  // ──────────────────────────────────────────────
  // SHOULDER
  // ──────────────────────────────────────────────
  Shoulder: [
    {
      key: "shoulder_rotator_cuff",
      label: "Rotator Cuff Tendons",
      text: "The supraspinatus, infraspinatus, subscapularis, and teres minor tendons are intact and normal in signal intensity and thickness. No partial-thickness or full-thickness tear, tendinosis, or retraction is identified.",
    },
    {
      key: "shoulder_biceps_tendon",
      label: "Biceps Tendon",
      text: "The long head of the biceps tendon is normal in course, caliber, and signal intensity within the bicipital groove. No tendinosis, partial tear, subluxation, or dislocation is identified.",
    },
    {
      key: "shoulder_labrum",
      label: "Labrum",
      text: "The glenoid labrum is normal in morphology and signal intensity. No labral tear, paralabral cyst, or SLAP lesion is identified.",
    },
    {
      key: "shoulder_glenohumeral_joint",
      label: "Glenohumeral Joint",
      text: "The glenohumeral joint demonstrates normal alignment with no significant joint effusion or loose body. Articular cartilage is preserved.",
    },
    {
      key: "shoulder_ac_joint",
      label: "Acromioclavicular Joint",
      text: "The acromioclavicular joint is normal in width and signal intensity. No AC joint arthrosis, distal clavicle osteolysis, or marrow edema is identified.",
    },
    {
      key: "shoulder_subacromial_bursa",
      label: "Subacromial/Subdeltoid Bursa",
      text: "The subacromial-subdeltoid bursa is normal with no bursitis or fluid distension.",
    },
    {
      key: "shoulder_bone_marrow",
      label: "Bone Marrow",
      text: "Bone marrow signal of the proximal humerus, scapula, and clavicle is normal. No occult fracture, avascular necrosis, bone bruise, or marrow-replacing lesion is identified.",
    },
    {
      key: "shoulder_muscles",
      label: "Muscles",
      text: "The periscapular and shoulder girdle muscles, including the deltoid, trapezius, and rhomboid musculature, are normal in signal and bulk with no fatty infiltration or atrophy.",
    },
  ],

  // ──────────────────────────────────────────────
  // HIP
  // ──────────────────────────────────────────────
  Hip: [
    {
      key: "hip_femoral_head_neck",
      label: "Femoral Head & Neck",
      text: "The femoral head and neck demonstrate normal marrow signal intensity with no evidence of avascular necrosis, occult fracture, or bone bruise. The femoral head sphericity is maintained.",
    },
    {
      key: "hip_acetabulum",
      label: "Acetabulum",
      text: "The acetabulum is normal in morphology and signal intensity. No acetabular fracture, labral tear, or osseous abnormality is identified.",
    },
    {
      key: "hip_labrum",
      label: "Labrum",
      text: "The acetabular labrum is normal in morphology and signal intensity without evidence of tear, degeneration, or paralabral cyst.",
    },
    {
      key: "hip_joint_space",
      label: "Joint Space",
      text: "The hip joint space is preserved. No significant joint effusion, loose body, or synovial proliferation is identified. Articular cartilage demonstrates normal thickness and signal.",
    },
    {
      key: "hip_muscles",
      label: "Surrounding Muscles",
      text: "The gluteal, iliopsoas, adductor, and hamstring muscle groups demonstrate normal signal intensity and bulk with no fatty infiltration, atrophy, or strain injury.",
    },
    {
      key: "hip_tendons",
      label: "Tendons",
      text: "The tendons about the hip, including the iliopsoas tendon, gluteal tendons, and proximal hamstring origin, are intact and normal without tendinosis or tear.",
    },
    {
      key: "hip_bone_marrow",
      label: "Bone Marrow",
      text: "Bone marrow signal of the proximal femur, acetabulum, and pelvic bones is normal without evidence of marrow-replacing process, metastatic disease, or suspicious lesion.",
    },
  ],

  // ──────────────────────────────────────────────
  // ABDOMEN
  // ──────────────────────────────────────────────
  Abdomen: [
    {
      key: "abdomen_liver",
      label: "Liver",
      text: "The liver is normal in size, contour, and signal intensity. No focal hepatic lesion is identified. No intrahepatic biliary dilatation. Hepatic vasculature is normal in flow and caliber.",
    },
    {
      key: "abdomen_gallbladder",
      label: "Gallbladder",
      text: "The gallbladder is normal in size and wall thickness. No cholelithiasis, gallbladder wall thickening, or pericholecystic fluid is identified. The cystic duct and common bile duct are normal in caliber.",
    },
    {
      key: "abdomen_spleen",
      label: "Spleen",
      text: "The spleen is normal in size and signal intensity without focal lesion.",
    },
    {
      key: "abdomen_pancreas",
      label: "Pancreas",
      text: "The pancreas is normal in size, signal intensity, and contour. The pancreatic duct is not dilated. No focal pancreatic lesion is identified.",
    },
    {
      key: "abdomen_kidneys",
      label: "Kidneys",
      text: "Both kidneys are normal in size, cortical thickness, and signal intensity bilaterally. No renal mass, hydronephrosis, or perinephric abnormality is identified. The renal collecting systems are unremarkable.",
    },
    {
      key: "abdomen_adrenals",
      label: "Adrenals",
      text: "The adrenal glands are normal in size and morphology bilaterally without focal lesion or hyperplasia.",
    },
    {
      key: "abdomen_bowel",
      label: "Bowel",
      text: "Visualized portions of the bowel are unremarkable in wall thickness and caliber. No bowel obstruction, wall thickening, or focal mass is identified. No free fluid or pneumatosis.",
    },
    {
      key: "abdomen_lymph_nodes",
      label: "Lymph Nodes",
      text: "No pathologically enlarged retroperitoneal, mesenteric, or portocaval lymph nodes are identified.",
    },
    {
      key: "abdomen_vasculature",
      label: "Vasculature",
      text: "The abdominal aorta and inferior vena cava are normal in caliber with no aneurysm, dissection, or thrombus. Major branch vessels are patent.",
    },
  ],

  // ──────────────────────────────────────────────
  // PELVIS
  // ──────────────────────────────────────────────
  Pelvis: [
    {
      key: "pelvis_bladder",
      label: "Bladder",
      text: "The urinary bladder is normal in wall thickness and distension. No mural lesion, wall thickening, or perivesical abnormality is identified.",
    },
    {
      key: "pelvis_uterus",
      label: "Uterus",
      text: "The uterus is normal in size and signal intensity. The endometrium and myometrium are normal. No focal uterine lesion is identified. The cervix is unremarkable.",
    },
    {
      key: "pelvis_prostate",
      label: "Prostate",
      text: "The prostate gland is normal in size and signal intensity without focal lesion or extracapsular extension. The seminal vesicles are normal bilaterally.",
    },
    {
      key: "pelvis_rectum",
      label: "Rectum",
      text: "The rectum is unremarkable in wall thickness and signal intensity. No perirectal mass or lymphadenopathy is identified.",
    },
    {
      key: "pelvis_sidewalls",
      label: "Pelvic Sidewalls",
      text: "Pelvic sidewalls are symmetric and unremarkable. No soft tissue mass, fluid collection, or lymphadenopathy is identified.",
    },
    {
      key: "pelvis_lymph_nodes",
      label: "Lymph Nodes",
      text: "No pathologically enlarged pelvic or inguinal lymph nodes are identified.",
    },
    {
      key: "pelvis_bones",
      label: "Pelvic Bones",
      text: "The pelvic bones, including the iliac bones, ischium, pubis, sacrum, and proximal femora, demonstrate normal marrow signal. No aggressive or suspicious osseous lesion, fracture, or avascular necrosis is identified.",
    },
    {
      key: "pelvis_muscles",
      label: "Pelvic Muscles",
      text: "The pelvic floor and gluteal musculature are normal in signal intensity and bulk with no atrophy, fatty infiltration, or tear.",
    },
  ],

  // ──────────────────────────────────────────────
  // CHEST
  // ──────────────────────────────────────────────
  Chest: [
    {
      key: "chest_lungs",
      label: "Lungs",
      text: "Lung parenchyma demonstrates normal signal intensity bilaterally. No pulmonary nodule, mass, consolidation, ground-glass opacity, or pleural effusion is identified.",
    },
    {
      key: "chest_mediastinum",
      label: "Mediastinum",
      text: "The mediastinum is normal in width and signal intensity. No mediastinal mass, lymphadenopathy, or thymic abnormality is identified.",
    },
    {
      key: "chest_heart",
      label: "Heart",
      text: "The heart is normal in size and chamber configuration. No pericardial effusion or focal wall motion abnormality is identified on available sequences.",
    },
    {
      key: "chest_great_vessels",
      label: "Great Vessels",
      text: "The great vessels, including the aorta and pulmonary arteries, are normal in caliber and signal with no aneurysm, dissection, or thrombus.",
    },
    {
      key: "chest_pleura",
      label: "Pleura",
      text: "The pleural surfaces are smooth bilaterally with no pleural effusion, thickening, or pleural-based mass.",
    },
    {
      key: "chest_chest_wall",
      label: "Chest Wall",
      text: "The chest wall, including ribs, sternum, sternoclavicular joints, and chest wall musculature, is unremarkable. No soft tissue mass, osseous lesion, or abnormality is identified.",
    },
    {
      key: "chest_diaphragm",
      label: "Diaphragm",
      text: "The hemidiaphragms are normal in contour and position bilaterally. No diaphragmatic eventration or hernia is identified.",
    },
    {
      key: "chest_upper_abdomen",
      label: "Upper Abdomen",
      text: "The visualized upper abdomen, including the liver and adrenal glands, is unremarkable. No focal hepatic lesion or adrenal mass is identified.",
    },
  ],

  // ──────────────────────────────────────────────
  // NECK (SOFT TISSUE)
  // ──────────────────────────────────────────────
  Neck: [
    {
      key: "neck_nasopharynx",
      label: "Nasopharynx",
      text: "The nasopharynx is normal in symmetry and signal intensity. The adenoids are normal in size. No nasopharyngeal mass or soft tissue abnormality is identified.",
    },
    {
      key: "neck_oropharynx",
      label: "Oropharynx",
      text: "The oropharynx, including the palatine tonsils, tongue base, and soft palate, is unremarkable. No oropharyngeal mass or asymmetry is identified.",
    },
    {
      key: "neck_larynx",
      label: "Larynx",
      text: "The larynx is normal. The true and false vocal cords are symmetric with normal signal and mobility. The epiglottis, aryepiglottic folds, and subglottic region are unremarkable. No laryngeal mass or lesion is identified.",
    },
    {
      key: "neck_thyroid",
      label: "Thyroid",
      text: "The thyroid gland is normal in size and signal intensity bilaterally. No thyroid nodule or focal lesion is identified.",
    },
    {
      key: "neck_salivary_glands",
      label: "Salivary Glands",
      text: "The parotid and submandibular glands are symmetric and normal in signal intensity bilaterally. No focal lesion, ductal dilatation, or inflammatory change is identified.",
    },
    {
      key: "neck_lymph_nodes",
      label: "Lymph Nodes",
      text: "No pathologically enlarged cervical, supraclavicular, or retropharyngeal lymph nodes are identified.",
    },
    {
      key: "neck_vessels",
      label: "Vessels",
      text: "The common, internal, and external carotid arteries, as well as the jugular veins, are bilaterally patent and normal in caliber. No vascular dissection, aneurysm, or thrombus is identified.",
    },
    {
      key: "neck_carotid_sheath",
      label: "Carotid Sheath",
      text: "The carotid sheaths are symmetric and unremarkable bilaterally with no mass or abnormal soft tissue.",
    },
    {
      key: "neck_spine",
      label: "Cervical Spine",
      text: "The cervical spine demonstrates normal alignment and marrow signal. No acute fracture or subluxation is identified. Prevertebral soft tissues are normal.",
    },
  ],

  // ──────────────────────────────────────────────
  // CARDIAC
  // ──────────────────────────────────────────────
  Cardiac: [
    {
      key: "cardiac_chamber_sizes",
      label: "Chamber Sizes",
      text: "All cardiac chambers are normal in size. The right and left atria and ventricles are within normal limits. No atrial or ventricular dilation is identified.",
    },
    {
      key: "cardiac_wall_thickness",
      label: "Wall Thickness",
      text: "Myocardial wall thickness is normal for all segments. No focal wall thinning, hypertrophy, or asymmetric thickening is identified.",
    },
    {
      key: "cardiac_valve_morphology",
      label: "Valve Morphology",
      text: "The atrioventricular and semilunar valves are normal in morphology and motion. No valvular stenosis, regurgitation, or vegetations are identified.",
    },
    {
      key: "cardiac_systolic_function",
      label: "Systolic Function",
      text: "Left ventricular systolic function is normal. No regional wall motion abnormality is identified. Estimated left ventricular ejection fraction is within normal limits.",
    },
    {
      key: "cardiac_pericardium",
      label: "Pericardium",
      text: "The pericardium is normal in thickness with no pericardial effusion, thickening, or constrictive physiology.",
    },
    {
      key: "cardiac_coronary_arteries",
      label: "Coronary Arteries",
      text: "The proximal coronary arteries demonstrate normal course and caliber on available sequences. No significant coronary artery aneurysm or proximal stenosis is identified.",
    },
  ],

  // ──────────────────────────────────────────────
  // BREAST
  // ──────────────────────────────────────────────
  Breast: [
    {
      key: "breast_fibroglandular",
      label: "Fibroglandular Tissue",
      text: "Fibroglandular tissue is normal in distribution and signal intensity bilaterally. No suspicious architectural distortion, mass, or abnormal signal focus is identified.",
    },
    {
      key: "breast_enhancement",
      label: "Parenchymal Enhancement",
      text: "There is no abnormal parenchymal enhancement bilaterally. No suspicious enhancing lesion is identified on post-contrast sequences.",
    },
    {
      key: "breast_lesions",
      label: "Lesions",
      text: "No suspicious mass, focal asymmetry, or architectural distortion is identified in either breast. No abnormal ductal enhancement or suspicious microcalcification is seen on available sequences.",
    },
    {
      key: "breast_axilla",
      label: "Axilla",
      text: "The axillae are bilaterally unremarkable. No pathologically enlarged axillary lymph nodes are identified.",
    },
    {
      key: "breast_pectoral_muscles",
      label: "Pectoral Muscles",
      text: "The pectoral muscles and chest wall are symmetric and unremarkable bilaterally with no chest wall invasion or abnormality.",
    },
  ],

  // ──────────────────────────────────────────────
  // PROSTATE
  // ──────────────────────────────────────────────
  Prostate: [
    {
      key: "prostate_zonal_anatomy",
      label: "Zonal Anatomy",
      text: "The prostate gland demonstrates normal zonal anatomy with clear differentiation between the peripheral zone, transition zone, central zone, and anterior fibromuscular stroma on T2-weighted imaging.",
    },
    {
      key: "prostate_peripheral_zone",
      label: "Peripheral Zone",
      text: "The peripheral zone is bilaterally symmetric and homogeneous in signal intensity. No focal area of low T2 signal, restricted diffusion, or abnormal enhancement is identified to suggest suspicious lesion.",
    },
    {
      key: "prostate_transition_zone",
      label: "Transition Zone",
      text: "The transition zone is normal in volume and signal intensity. No transition zone nodule, stromal hyperplasia, or suspicious focal lesion is identified.",
    },
    {
      key: "prostate_seminal_vesicles",
      label: "Seminal Vesicles",
      text: "The seminal vesicles are normal in size, signal intensity, and symmetry bilaterally with no invasion or abnormality.",
    },
    {
      key: "prostate_neurovascular_bundles",
      label: "Neurovascular Bundles",
      text: "The neurovascular bundles are symmetric and preserved bilaterally. No extracapsular extension or neurovascular bundle invasion is identified.",
    },
  ],

  // ──────────────────────────────────────────────
  // OTHER (GENERIC)
  // ──────────────────────────────────────────────
  Other: [
    {
      key: "other_soft_tissues",
      label: "Soft Tissues",
      text: "The soft tissues in the region of interest are unremarkable. No soft tissue mass, fluid collection, or abnormality is identified.",
    },
    {
      key: "other_bones",
      label: "Bones",
      text: "The visualized osseous structures demonstrate normal marrow signal and morphology. No fracture, aggressive lesion, or marrow-replacing process is identified.",
    },
    {
      key: "other_joints",
      label: "Joints",
      text: "The visualized joints are unremarkable with preserved joint spaces and no effusion, loose body, or synovial abnormality.",
    },
    {
      key: "other_vasculature",
      label: "Vasculature",
      text: "The major vascular structures in the region of interest are patent and normal in caliber. No aneurysm, thrombus, or vascular malformation is identified.",
    },
    {
      key: "other_lymph_nodes",
      label: "Lymph Nodes",
      text: "No pathologically enlarged lymph nodes are identified in the region of interest.",
    },
  ],
};