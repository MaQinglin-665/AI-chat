extends Node3D
# A self-contained, replaceable art scene. No actor, network or behavior ownership.
@export_enum("day", "dusk", "night") var lighting_preset := "night"
var region := NavigationRegion3D.new()
var objects := {}
var interaction_markers := {}
var g := preload("res://art/geometry.gd").new()
var environment := Environment.new()
var key_light := DirectionalLight3D.new()
var fill_light := DirectionalLight3D.new()
var practicals: Array[OmniLight3D] = []
var window_material := ShaderMaterial.new()
var ready_for_navigation := false
var ceiling: MeshInstance3D
@export_enum("high", "medium", "low", "balanced") var quality_profile := "medium"
@export var quality_visuals := true
var quality_art: Node3D

func _ready():
	region.name = "WalkableRoom"
	add_child(region)
	build_shell()
	build_sofa()
	build_bed()
	build_desk()
	build_shelf()
	build_window()
	build_lamp(Vector3(-1.55,0,-2.5))
	plant("plant", Vector3(3.65,0,2.2),1.0)
	plant("window_plant",Vector3(-3.5,1.03,-3.55),.28)
	build_rug()
	wall_art()
	build_lived_in_details()
	build_lighting()
	if quality_visuals and ResourceLoader.exists("res://art/quality/bedroom-static.scn"):
		quality_art=preload("res://art/bedroom_quality.gd").new()
		add_child(quality_art)
		quality_art.install(self)
	set_lighting_preset(lighting_preset)
	if RenderingServer.get_current_rendering_method()=="mobile" and quality_profile=="medium":quality_profile="low"
	set_quality_profile(quality_profile)
	bake_navigation()

func body(id: String, pos: Vector3, size: Vector3, actions := [], collision_offset := Vector3.ZERO) -> StaticBody3D:
	var node := StaticBody3D.new()
	node.name = id
	node.position = pos
	region.add_child(node)
	g.collision(node,collision_offset,size)
	if not actions.is_empty():
		node.set_meta("id",id)
		node.set_meta("affordances",actions)
		objects[id] = node
	return node

func interaction(node: StaticBody3D, approach: Vector3, seat := Vector3.ZERO, yaw := 0.0):
	var marker := Marker3D.new()
	marker.name = "Interaction"
	marker.set_meta("id",str(node.name))
	marker.set_meta("affordances",node.get_meta("affordances"))
	marker.add_to_group("room_interactions")
	node.add_child(marker)
	var near := Marker3D.new()
	near.name = "Approach"
	near.position = approach
	marker.add_child(near)
	marker.set_meta("approach",NodePath("Approach"))
	marker.set_meta("approach_position",approach)
	if "sit" in node.get_meta("affordances"):
		var point := Marker3D.new()
		point.name = "Seat"
		point.position = seat
		point.rotation.y = yaw
		marker.add_child(point)
		marker.set_meta("seat",NodePath("Seat"))
		marker.set_meta("seat_position",seat)
		marker.set_meta("seat_yaw",yaw)
	interaction_markers[str(node.name)] = marker

func build_shell():
	var floor = body("floor",Vector3(0,-.10,0),Vector3(9,.2,8))
	# Matte oiled oak: the old dielectric highlight desaturated the cool-lit half.
	# Duplicate only the floor material; other wood and all light presets are unchanged.
	var floor_wood=g.wood("a77b58").duplicate()
	floor_wood.set_shader_parameter("wood_roughness",.90)
	floor_wood.set_shader_parameter("specular_strength",0.0)
	g.box(floor,Vector3.ZERO,Vector3(9,.2,8),floor_wood,.01,"OakFloor")
	# Thin plank grooves are geometry, not a texture. Zero animation/time dependence.
	var groove = g.material("99775e")
	for i in range(23):
		g.box(floor,Vector3(-4.4+i*.4,.102,0),Vector3(.004,.003,8),groove,.001)
	for x in range(22):
		for z in range(4):
			g.box(floor,Vector3(-4.2+x*.4,.103,-3.6+z*2.+(x%2)*.6),Vector3(.39,.003,.004),groove,.001)
	var plaster = g.material("b7abbc")
	for spec in [["BackWall",Vector3(0,1.6,-4),Vector3(9,3.2,.15)],["LeftWall",Vector3(-4.5,1.6,0),Vector3(.15,3.2,8)],["RightWall",Vector3(4.5,1.6,0),Vector3(.15,3.2,8)],["FrontWall",Vector3(0,1.6,4),Vector3(9,3.2,.15)]]:
		var wall = body(spec[0],spec[1],spec[2])
		g.box(wall,Vector3.ZERO,spec[2],plaster,.01)
		var trim = Vector3(spec[2].x,.12,spec[2].z)+Vector3(.025,0,.025)
		g.box(wall,Vector3(0,-1.49,0),trim,g.wood("887065"),.008)
		g.box(wall,Vector3(0,1.50,0),trim,g.material("dacfc8"),.008)
	ceiling = g.box(region,Vector3(0,3.26,0),Vector3(9,.12,8),g.material("c4b9c6"),.01,"CeilingVisual")
	# Wainscot divisions on the rear wall.
	for i in range(12):
		g.box(region,Vector3(-4.2+i*.76,.48,-3.90),Vector3(.022,.70,.028),g.material("c9bbbf"),.005)
	g.box(region,Vector3(0,.88,-3.89),Vector3(9,.045,.04),g.material("d3c6c6"),.008)

func build_sofa():
	var sofa = body("sofa",Vector3(-3,.25,-1),Vector3(2.30,1.12,1.08),["sit","look"],Vector3(0,.31,-.02))
	var fabric = g.material("9d8baf")
	var cushion = g.material("c2b0ca")
	g.box(sofa,Vector3(0,-.06,0),Vector3(2.08,.25,.95),g.wood("825b48"),.07)
	g.box(sofa,Vector3(0,.52,-.45),Vector3(2.12,.66,.20),fabric,.075)
	for side in [-1,1]:
		g.box(sofa,Vector3(side*1.03,.28,0),Vector3(.22,.62,1.04),fabric,.09)
		g.box(sofa,Vector3(side*.48,.14,.035),Vector3(.91,.22,.82),cushion,.08)
		var pillow=g.box(sofa,Vector3(side*.60,.47,-.24),Vector3(.44,.42,.16),g.material("d8b3b9" if side==1 else "ded2c9"),.065)
		pillow.rotation_degrees.z=side*-11
		for z in [-.34,.34]:g.cylinder(sofa,Vector3(side*.86,-.17,z),.045,.04,.16,g.wood("74513e"))
	# Fold over the OUTSIDE of the right arm, leaving both shin corridors clear.
	g.box(sofa,Vector3(1.045,.602,-.08),Vector3(.25,.018,.68),g.material("ad7890"),.007,"ThrowTop")
	g.box(sofa,Vector3(1.155,.24,-.08),Vector3(.018,.70,.68),g.material("ad7890"),.007,"ThrowOuter")
	for i in range(8):
		g.box(sofa,Vector3(1.166,-.15,-.37+i*.082),Vector3(.012,.09,.014),g.material("c29ab0"),.004,"ThrowFringe"+str(i))
	interaction(sofa,Vector3(0,-.25,1.0),Vector3(0,.25,.08),0.0)

func build_bed():
	var bed=body("bed",Vector3(-3.05,.38,1.82),Vector3(1.85,.75,2.52),["look","sit"])
	var oak=g.wood("9e7456")
	g.box(bed,Vector3(0,-.14,0),Vector3(1.85,.28,2.52),oak,.065)
	g.box(bed,Vector3(0,.28,-1.20),Vector3(1.90,1.1,.13),oak,.055)
	g.collision(bed,Vector3(0,.28,-1.20),Vector3(1.90,1.1,.13))
	g.box(bed,Vector3(0,.12,0),Vector3(1.77,.28,2.36),g.material("e0d5d0"),.10)
	g.box(bed,Vector3(0,.28,.24),Vector3(1.80,.19,1.87),g.material("c5acbf"),.085)
	for side in [-1,1]:
		var pillow=g.box(bed,Vector3(side*.43,.34,-.83),Vector3(.72,.19,.43),g.material("e8d8d3"),.08)
		pillow.rotation_degrees.z=side*5
		for z in [-.97,.97]:g.cylinder(bed,Vector3(side*.76,-.28,z),.05,.045,.20,oak)
	g.box(bed,Vector3(0,.40,.65),Vector3(1.82,.035,.58),g.material("a37c99"),.015)
	for stripe in range(12):g.box(bed,Vector3(-.83+stripe*.15,.42,.65),Vector3(.016,.008,.55),g.material("d1afc5"),.003)
	# Keep the original standing approach; sit along the room-facing (+X) edge.
	interaction(bed,Vector3(1.65,-.38,-.5),Vector3(.82,.375,-.20),PI*.5)
	var bed_seat=interaction_markers.bed.get_node("Seat")
	bed_seat.set_meta("id","bed_edge_seat")
	bed_seat.set_meta("affordances",["sit"])
	var side=body("bedside",Vector3(-1.65,.30,2.6),Vector3(.50,.60,.48),["look"])
	g.box(side,Vector3.ZERO,Vector3(.5,.6,.48),oak,.035)
	g.box(side,Vector3(0,.10,.248),Vector3(.43,.19,.035),g.material("c2a68d"),.012)
	g.sphere(side,Vector3(0,.1,.28),Vector3(.045,.045,.04),g.material("cbb889",.35))
	g.box(side,Vector3(0,.34,0),Vector3(.56,.06,.54),oak,.018)
	interaction(side,Vector3(.65,-.30,0))
	g.cylinder(side,Vector3(0,.43,0),.09,.07,.13,g.material("d4b794",.4))
	g.cylinder(side,Vector3(0,.66,0),.17,.13,.25,g.material("f5d5a3",.9,.15))
	practical(side,Vector3(0,.61,0),1.5,2.6)

func build_desk():
	var desk=body("desk",Vector3(2.4,.76,-2.9),Vector3(1.85,.13,.90),["look"])
	var oak=g.wood("9e765a")
	g.box(desk,Vector3.ZERO,Vector3(1.85,.13,.90),oak,.04)
	for x in [-.78,.78]:
		for z in [-.32,.32]:
			g.box(desk,Vector3(x,-.37,z),Vector3(.075,.73,.075),oak,.012)
			g.collision(desk,Vector3(x,-.37,z),Vector3(.075,.73,.075))
	# Desktop monitor and original abstract screen (no branded imagery).
	g.box(desk,Vector3(0,.11,-.17),Vector3(.33,.045,.23),g.material("514752"),.018)
	g.box(desk,Vector3(0,.26,-.20),Vector3(.055,.29,.055),g.material("514752"),.01)
	g.box(desk,Vector3(0,.48,-.24),Vector3(.76,.45,.05),g.material("48414d"),.02)
	g.collision(desk,Vector3(0,.48,-.24),Vector3(.76,.45,.05))
	g.box(desk,Vector3(0,.48,-.209),Vector3(.69,.38,.009),g.material("7b7b9d",.8,.10),.01)
	g.box(desk,Vector3(-.02,.093,.23),Vector3(.56,.045,.19),g.material("c5b9bc"),.015)
	for row in range(3):
		for col in range(11):g.box(desk,Vector3(-.26+col*.047,.12,.17+row*.047),Vector3(.035,.012,.033),g.material("ded4d3"),.005)
	var chair=body("chair",Vector3(2.4,.23,-1.95),Vector3(.66,1.05,.74),["sit","look"],Vector3(0,.295,.03))
	g.box(chair,Vector3(0,.145,0),Vector3(.64,.17,.62),g.material("bd9da9"),.065)
	g.box(chair,Vector3(0,.52,.28),Vector3(.62,.59,.09),g.material("b399ab"),.04)
	for x in [-.23,.23]:
		for z in [-.22,.22]:g.cylinder(chair,Vector3(x,-.04,z),.032,.032,.35,oak)
	interaction(chair,Vector3(-1.0,-.23,0),Vector3(0,.23,0),PI)
	interaction(desk,Vector3(-1.3,-.76,.25))
	var book=body("book",Vector3(1.90,.87,-2.75),Vector3(.27,.08,.21),["look","pick_up"])
	g.box(book,Vector3.ZERO,Vector3(.27,.08,.21),g.material("8c536c"),.01)
	g.box(book,Vector3(.014,0,.007),Vector3(.23,.05,.19),g.material("e2d8c1"),.005)
	interaction(book,Vector3(-.8,-.87,.65))
	g.cylinder(desk,Vector3(.66,.13,-.20),.11,.10,.12,g.material("b2946e",.35))
	g.cylinder(desk,Vector3(.66,.36,-.20),.018,.018,.42,g.material("b2946e",.35))
	g.cylinder(desk,Vector3(.66,.60,-.20),.22,.14,.24,g.material("f2d6ac",.8,.12))
	practical(desk,Vector3(.66,.53,-.20),1.8,3.0)

func build_shelf():
	var shelf=body("shelf",Vector3(4.03,.98,-.4),Vector3(.66,1.96,1.58),["look"])
	var oak=g.wood("9b7455")
	g.box(shelf,Vector3(.26,0,0),Vector3(.09,1.96,1.58),oak,.016)
	for z in [-.75,.75]:g.box(shelf,Vector3(0,0,z),Vector3(.62,1.96,.09),oak,.016)
	for level in range(5):
		var y=-.90+level*.45
		g.box(shelf,Vector3(0,y,0),Vector3(.64,.065,1.55),oak,.013)
		if level==4:continue
		for i in range(7):
			var h=.25+(i%3)*.035
			var book=g.box(shelf,Vector3(-.045,y+h*.5+.035,-.63+i*.19),Vector3(.36,h,.13),g.material(["ab8191","748b93","b59d78","a3a37e","9082a2"][(i+level*2)%5]),.009)
			book.rotation_degrees.x = -4 if i==5 else 0
			g.box(shelf,Vector3(-.232,y+h*.24+.04,-.63+i*.19),Vector3(.008,.018,.095),g.material("d5c6a8"),.003)
	interaction(shelf,Vector3(-1.05,-.98,.20))

func build_window():
	var window=body("window",Vector3(-1.95,1.96,-3.88),Vector3(3.25,1.76,.10),["look"])
	window_material.shader=preload("res://art/window.gdshader")
	var quad := QuadMesh.new()
	quad.size=Vector2(3.22,1.72)
	g.mesh_node(window,quad,Vector3(0,0,.07),window_material,"NightSky")
	var frame=g.wood("b29a85")
	for x in [-1.66,0,1.66]:g.box(window,Vector3(x,0,.14),Vector3(.065,1.86,.11),frame,.009)
	for y in [-.9,.9]:g.box(window,Vector3(0,y,.14),Vector3(3.39,.065,.11),frame,.01)
	g.box(window,Vector3(0,-.92,.23),Vector3(3.48,.075,.45),frame,.012)
	for side in [-1,1]:
		for i in range(7):
			var x=side*(1.73+i*.045)
			g.cylinder(window,Vector3(x,-.05,.24+sin(i*1.7)*.025),.047,.047,2.35,g.material("c1b5c9"))
	interaction(window,Vector3(-.45,-1.96,1.0))

func build_lamp(pos: Vector3):
	var lamp=body("floor_lamp",pos+Vector3(0,.75,0),Vector3(.70,1.55,.70),["look"])
	var metal=g.material("b89865",.38)
	g.cylinder(lamp,Vector3(0,-.71,0),.22,.19,.08,metal)
	for angle in [0.,2.094,4.188]:
		var leg=g.cylinder(lamp,Vector3(sin(angle)*.1,-.18,cos(angle)*.1),.026,.025,1.1,g.wood("a9805a"))
		leg.rotation_degrees.z=sin(angle)*9
		leg.rotation_degrees.x=cos(angle)*9
	g.cylinder(lamp,Vector3(0,.55,0),.34,.24,.43,g.material("f4d2a5",.9,.12))
	practical(lamp,Vector3(0,.51,0),2.4,4.4)
	interaction(lamp,Vector3(.95,-.75,.4))

func plant(id: String, pos: Vector3, scale_value: float):
	var pot=body(id,pos+Vector3(0,.45*scale_value,0),Vector3(.65,1.15,.65)*scale_value,["look"],Vector3(0,.1*scale_value,0))
	var size=scale_value
	g.cylinder(pot,Vector3(0,-.25*size,0),.17*size,.24*size,.40*size,g.material("c0a28b"))
	g.cylinder(pot,Vector3(0,-.035*size,0),.24*size,.24*size,.05*size,g.material("b9947d"))
	for i in range(11):
		var angle=i*2.399
		var height=.13+(i%4)*.14
		var x=sin(angle)*(.13+(i%3)*.025)
		var z=cos(angle)*(.13+(i%3)*.025)
		var stem=g.cylinder(pot,Vector3(x*.5,height*.5,z*.5)*size,.009*size,.006*size,(height+.15)*size,g.material("597355"))
		stem.rotation_degrees=Vector3(cos(angle)*20,0,-sin(angle)*20)
		g.leaf(pot,Vector3(x,height,z)*size,Vector3(.22,.045,.39)*size,Vector3(-20,sin(angle)*180,cos(angle)*20),g.material("6d8a67" if i%2 else "879875"))
	interaction(pot,Vector3(-.7*size,-pot.position.y,.65+.25*size))

func build_rug():
	var rug=body("rug",Vector3(-.25,.009,.65),Vector3(2.8,.018,2.05),["look"])
	g.box(rug,Vector3.ZERO,Vector3(2.8,.018,2.05),g.material("ba9caa"),.007)
	g.box(rug,Vector3(0,.012,0),Vector3(2.59,.012,1.83),g.material("c9b7be"),.005)
	for i in range(17):
		var x=-1.2+i*.15
		g.box(rug,Vector3(x,.02,0),Vector3(.012,.004,1.68),g.material("bdaab3"),.001)
		for side in [-1,1]:g.box(rug,Vector3(x,0,side*1.06),Vector3(.018,.01,.11),g.material("d4c4c5"),.003)
	interaction(rug,Vector3(1.8,-.009,0))

func wall_art():
	var paintings = [[Vector3(.35,1.85,-3.87),Vector2(.70,.91)],[Vector3(1.15,2.20,-3.87),Vector2(.40,.51)]]
	for index in range(paintings.size()):
		var spec=paintings[index]
		var frame=body("wall_art_"+str(index),spec[0],Vector3(spec[1].x,spec[1].y,.05),["look"])
		g.box(frame,Vector3.ZERO,Vector3(spec[1].x,spec[1].y,.05),g.wood("ab8c70"),.015)
		painting(frame,Vector3(0,0,.041),spec[1]-Vector2(.06,.06),index)
		interaction(frame,Vector3(0,-spec[0].y,1.1))
	# Left-wall framed linen panels and an herb ledge, original geometry only.
	for i in range(3):
		var panel=body("bed_panel_"+str(i),Vector3(-4.39,1.70,1.1+i*.54),Vector3(.05,.78,.45))
		g.box(panel,Vector3.ZERO,Vector3(.05,.78,.45),g.wood("a98b72"),.012)
		var print_node=painting(panel,Vector3(.041,0,0),Vector2(.37,.70),i)
		print_node.rotation.y=PI*.5
	# A quiet string of tiny warm beads; no animation or expensive light per bead.
	for i in range(23):
		var x=-4.2+i*.38
		var y=2.98-.14*sin(i*.285)
		g.sphere(region,Vector3(x,y,-3.80),Vector3(.035,.045,.035),g.material("e8ba7f",.7,.22))

func painting(parent: Node3D, pos: Vector3, size: Vector2, design: int) -> MeshInstance3D:
	var mat=ShaderMaterial.new()
	mat.shader=preload("res://art/painting.gdshader")
	mat.set_shader_parameter("design",design)
	var quad=QuadMesh.new()
	quad.size=size
	return g.mesh_node(parent,quad,pos,mat,"OriginalPrint")

func decorative_plant(id: String, pos: Vector3, height: float):
	# These pots are on existing furniture, outside walking/approach footprints.
	# They are scenery only: do not register or modify any interaction Marker.
	var pot=Node3D.new()
	pot.name=id
	region.add_child(pot)
	pot.position=pos+Vector3(0,height*.5,0)
	g.cylinder(pot,Vector3(0,-height*.5+.11,0),.12,.17,.22,g.material("c99a88"))
	g.cylinder(pot,Vector3(0,-height*.5+.22,0),.155,.155,.012,g.material("55443d"))
	for i in range(9):
		var angle=i*2.399
		var top=height*(.60+(i%3)*.17)
		var x=sin(angle)*.13
		var z=cos(angle)*.13
		var stem=g.cylinder(pot,Vector3(x*.5,-height*.5+(.22+top)*.5,z*.5),.007,.004,top-.22,g.material("526b51"))
		stem.rotation_degrees=Vector3(cos(angle)*15,0,-sin(angle)*15)
		g.leaf(pot,Vector3(x,-height*.5+top,z),Vector3(.17,.045,.30),Vector3(-25,rad_to_deg(angle),15),g.material("6d8763" if i%2 else "8f9e74"))

func build_lived_in_details():
	decorative_plant("decor_window_fern",Vector3(-.85,1.078,-3.65),.66)
	decorative_plant("decor_shelf_fern",Vector3(4.0,1.98,.05),.67)
	# Original small sleepy bear on the duvet, away from bed's standing approach.
	var bed=objects.bed
	var fur=g.material("805b43")
	var muzzle=g.material("c5a187")
	var cocoa=g.material("604745")
	var plush=Node3D.new()
	plush.name="DuvetBear"
	bed.add_child(plush)
	plush.position=Vector3(-.46,.55,-.38)
	g.sphere(plush,Vector3(0,0,0),Vector3(.28,.33,.23),fur)
	g.sphere(plush,Vector3(0,.23,0),Vector3(.29,.26,.23),fur)
	for side in [-1,1]:
		g.sphere(plush,Vector3(side*.12,.34,0),Vector3(.10,.11,.075),fur)
		g.sphere(plush,Vector3(side*.12,-.12,.06),Vector3(.12,.10,.14),fur)
		g.sphere(plush,Vector3(side*.17,.02,.015),Vector3(.095,.18,.10),fur)
		g.box(plush,Vector3(side*.055,.25,.111),Vector3(.04,.009,.012),cocoa,.003)
	g.sphere(plush,Vector3(0,.205,.122),Vector3(.13,.085,.045),muzzle)
	g.sphere(plush,Vector3(0,.218,.149),Vector3(.030,.023,.018),cocoa)
	g.sphere(plush,Vector3(0,-.005,.113),Vector3(.16,.18,.02),muzzle)
	# Ceramic mug, tea surface and ring handle, all original unbranded geometry.
	var desk=objects.desk
	var ceramic=g.material("d8b2ae",.92)
	g.cylinder(desk,Vector3(.62,.075,.17),.12,.12,.018,g.material("c9ab8c"))
	g.cylinder(desk,Vector3(.62,.16,.17),.073,.084,.16,ceramic)
	g.cylinder(desk,Vector3(.62,.245,.17),.075,.075,.009,g.material("694b3d"))
	var ring=TorusMesh.new()
	ring.inner_radius=.035
	ring.outer_radius=.052
	ring.rings=12
	ring.ring_segments=12
	var handle=g.mesh_node(desk,ring,Vector3(.725,.17,.17),ceramic,"MugHandle")
	handle.rotation.x=PI*.5
	# Notebook stays separate from the pre-existing pick_up book and keyboard.
	g.box(desk,Vector3(-.66,.083,.22),Vector3(.30,.027,.29),g.material("83948f"),.008,"NotebookCover")
	g.box(desk,Vector3(-.66,.101,.22),Vector3(.27,.012,.26),g.material("e7dac4"),.003)
	for i in range(6):
		g.box(desk,Vector3(-.66,.109,.14+i*.028),Vector3(.20,.001,.002),g.material("b4ab9e"),.0003)
	var pen=g.cylinder(desk,Vector3(-.50,.115,.22),.007,.007,.23,g.material("755a73"))
	pen.rotation.x=PI*.5

func practical(parent: Node3D, pos: Vector3, energy: float, light_range: float):
	var light:=OmniLight3D.new()
	light.position=pos
	light.light_color=Color("ffd6a2")
	light.light_energy=energy
	light.omni_range=light_range
	light.omni_attenuation=1.4
	# Only the room key casts a shadow; small lamps remain cheap on integrated GPUs.
	light.shadow_enabled=false
	light.set_meta("base_energy",energy)
	parent.add_child(light)
	practicals.append(light)

func build_lighting():
	var world:=WorldEnvironment.new()
	world.name="BedroomEnvironment"
	world.environment=environment
	add_child(world)
	environment.background_mode=Environment.BG_COLOR
	environment.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
	environment.tonemap_mode=Environment.TONE_MAPPER_FILMIC
	environment.tonemap_exposure=.95
	environment.ssao_enabled=false
	key_light.name="SoftCharacterKey"
	key_light.rotation_degrees=Vector3(-38,-28,0)
	key_light.shadow_enabled=true
	key_light.directional_shadow_mode=DirectionalLight3D.SHADOW_ORTHOGONAL
	key_light.directional_shadow_max_distance=18
	key_light.light_angular_distance=3.0
	key_light.shadow_blur=1.3
	key_light.shadow_opacity=.75
	add_child(key_light)
	fill_light.name="CharacterFrontFill"
	fill_light.rotation_degrees=Vector3(-20,152,0)
	fill_light.shadow_enabled=false
	add_child(fill_light)

func set_lighting_preset(preset: String) -> bool:
	if preset not in ["day","dusk","night"]: return false
	lighting_preset=preset
	var settings={
		"day":["c2ccd9","f7e9d4","dee9f4",.42,.72,.32,.12,"617d9e","b2c3cd",0.0],
		"dusk":["9a859b","ffd4aa","b6b5df",.38,.76,.38,.62,"605473","c98e86",.20],
		"night":["6c7796","edcfb9","b6c5ee",.28,.40,.28,.80,"17243f","3a4a6b",1.0]
	}[preset]
	environment.background_color=Color(settings[0])*.35
	environment.ambient_light_color=Color(settings[0])
	environment.ambient_light_energy=settings[3]
	key_light.light_color=Color(settings[1])
	key_light.light_energy=settings[4]
	fill_light.light_color=Color(settings[2])
	fill_light.light_energy=settings[5]
	for lamp in practicals:lamp.light_energy=lamp.get_meta("base_energy")*settings[6]
	window_material.set_shader_parameter("zenith",Color(settings[7]))
	window_material.set_shader_parameter("horizon",Color(settings[8]))
	window_material.set_shader_parameter("night",settings[9])
	if quality_art:quality_art.set_period(preset)
	return true

func set_quality_profile(profile: String) -> bool:
	if profile not in ["high","medium","low","balanced"]:return false
	quality_profile="medium" if profile=="balanced" else profile
	key_light.shadow_enabled=quality_profile!="low"
	if quality_art:quality_art.set_quality(quality_profile)
	return true

func bake_navigation():
	var nav:=NavigationMesh.new()
	nav.geometry_parsed_geometry_type=NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nav.agent_max_climb=.2
	nav.agent_radius=.375
	nav.cell_size=.125
	nav.cell_height=.1
	nav.agent_height=1.7
	region.navigation_mesh=nav
	region.bake_navigation_mesh(false)
	# This bedroom has a flat floor: furniture tops are not walking surfaces.
	# Keep the actual baked clearance boundaries but discard elevated islands.
	var floor_polygons := []
	var vertices=nav.get_vertices()
	for i in range(nav.get_polygon_count()):
		var polygon=nav.get_polygon(i)
		var ground=true
		for index in polygon:
			if vertices[index].y>.35: ground=false
		if ground:floor_polygons.append(polygon)
	nav.clear_polygons()
	for polygon in floor_polygons:nav.add_polygon(polygon)
	ready_for_navigation=nav.get_polygon_count()>0
	print("bedroom navigation polygons ",nav.get_polygon_count()," interactions ",interaction_markers.size())
