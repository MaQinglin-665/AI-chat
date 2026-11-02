extends AudioStreamPlayer3D
const WOOD=[preload("res://audio/steps/wood0.wav"),preload("res://audio/steps/wood1.wav")]
const RUG=[preload("res://audio/steps/rug0.wav"),preload("res://audio/steps/rug1.wav")]
var previous: Vector3
var distance := 0.
var side := 0

func _ready():
	previous=get_parent().global_position
	unit_size=1.6
	max_distance=12.
	volume_db=-12.

func _physics_process(delta):
	var actor=get_parent()
	var point:Vector3=actor.global_position
	var travel=(point-previous).slide(Vector3.UP).length()
	previous=point
	if travel>.4 or travel<.001 or absf(actor.velocity.y)>.8:
		if travel>.4: distance=0.
		return
	distance+=travel
	if distance<clampf(.50+travel/maxf(delta,.001)*.065,.53,.78): return
	distance=0.
	var rug=actor.get_parent().target_object("rug")
	var on_rug=false
	if rug:
		for node in rug.get_children():
			if node is CollisionShape3D and node.shape is BoxShape3D:
				var local=node.to_local(point)
				var half=node.shape.size*.5
				on_rug=absf(local.x)<=half.x and absf(local.z)<=half.z
				break
	stream=(RUG if on_rug else WOOD)[side]
	side=1-side
	pitch_scale=randf_range(.94,1.07)
	play()
