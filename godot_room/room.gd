extends Node3D

var region := NavigationRegion3D.new()
var objects := {}

func box(id: String, center: Vector3, size: Vector3, color: Color, actions := []):
	var body := StaticBody3D.new()
	body.name = id
	body.position = center
	region.add_child(body)
	var mesh := BoxMesh.new()
	mesh.size = size
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mesh.material = mat
	var visual := MeshInstance3D.new()
	visual.mesh = mesh
	body.add_child(visual)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	if not actions.is_empty():
		body.set_meta("affordances", actions)
		objects[id] = body
	return body

func _ready():
	add_child(region)
	box("floor",Vector3(0,-.1,0),Vector3(9,.2,8),Color("#bc967b"))
	box("back",Vector3(0,1.6,-4),Vector3(9,3.2,.15),Color("#b8a8bf"))
	for side in [-1,1]:
		box("wall"+str(side),Vector3(side*4.5,1.6,0),Vector3(.15,3.2,8),Color("#bfadbb"))
	box("front",Vector3(0,1.6,4),Vector3(9,3.2,.15),Color("#ae9faa"))
	box("sofa",Vector3(-3,.25,-1),Vector3(2,.5,.9),Color("#987991"),["sit","look"])
	box("sofa_back",Vector3(-3,.65,-1.45),Vector3(2,.7,.18),Color("#82647b"))
	box("desk",Vector3(2.4,.76,-2.9),Vector3(1.7,.12,.85),Color("#865d46"),["look"])
	for x in [1.67,3.13]:
		for z in [-3.2,-2.6]:
			box("leg",Vector3(x,.36,z),Vector3(.09,.72,.09),Color("#79573f"))
	box("chair",Vector3(2.4,.23,-1.95),Vector3(.55,.46,.55),Color("#ba9373"),["sit"])
	box("shelf",Vector3(4.32,.9,-.4),Vector3(.08,1.8,1.5),Color("#89664f"),["look"])
	for level in range(4):
		var height := .10 + level*.52
		box("shelf_board", Vector3(4.03,height,-.4),Vector3(.57,.055,1.5),Color("#916e57"))
		for book in range(6):
			var h := .23+.035*(book%3)
			var tint := Color.from_hsv(fmod(book*.21+level*.13,1.),.28,.62)
			box("spine",Vector3(4.0,height+h*.5+.03,-1.+book*.17),Vector3(.28,h,.12),tint)
	box("chair_back",Vector3(2.4,.67,-1.69),Vector3(.55,.45,.07),Color("#ad8463"))
	box("sill",Vector3(-2.1,1.11,-3.82),Vector3(1.87,.07,.22),Color("#a58877"))
	box("mullion",Vector3(-2.1,1.8,-3.85),Vector3(.045,1.35,.06),Color("#c7bbc4"))
	box("book",Vector3(2.2,.86,-2.8),Vector3(.24,.07,.18),Color("#78455b"),["look","pick_up"])
	box("window",Vector3(-2.1,1.8,-3.9),Vector3(1.7,1.35,.04),Color("#94bdda"),["look"])
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#59556c")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#dbcfdf")
	env.ambient_light_energy = .55
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.ssao_enabled = true
	var world := WorldEnvironment.new()
	world.environment = env
	add_child(world)
	var light := OmniLight3D.new()
	light.position = Vector3(-2,2.9,-2.9)
	light.light_color = Color("#ffe3c3")
	light.light_energy = 5
	light.omni_range = 11
	light.shadow_enabled = true
	add_child(light)
	var nav := NavigationMesh.new()
	nav.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nav.agent_max_climb = .2
	nav.agent_radius = .375
	nav.cell_size = .125
	nav.cell_height = .1
	nav.agent_height = 1.7
	region.navigation_mesh = nav
	region.bake_navigation_mesh(false)
	print("room navigation polygons ",nav.get_polygon_count()," interactables ",objects.keys())

	var player = preload("res://player.gd").new()
	player.name = "Player"
	player.position = Vector3(0,0,2.8)
	add_child(player)

	var companion = preload("res://companion.gd").new()
	companion.name = "Companion"
	companion.position = Vector3(-1,0,-2)
	add_child(companion)

	add_child(preload("res://bridge.gd").new())
