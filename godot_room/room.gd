extends Node3D
const BEDROOM = preload("res://art/bedroom.tscn")
const MIN_CUSHION_WIDTH := .78
var art
var region
var objects := {}
var markers := {}
var seat_targets := {}
var period := ""
var period_check := 0.

func _ready():
	art = BEDROOM.instantiate()
	add_child(art)
	region = art.region
	for marker in art.interaction_markers.values():
		var id = marker.get_meta("id")
		markers[id] = marker
		objects[id] = marker.get_parent()
		if marker.has_meta("seat"):
			var seat=marker.get_node(marker.get_meta("seat"))
			if seat.has_meta("id"):
				seat_targets[seat.get_meta("id")] = objects[id]
	refresh_period()
	spawn_actors()

func refresh_period():
	# Same local clock boundaries as web/stageThemeController.js.
	var hour = Time.get_time_dict_from_system().hour
	var next = "dusk" if hour >= 17 and hour < 20 else "day" if hour >= 5 and hour < 17 else "night"
	if next != period:
		period = next
		art.set_lighting_preset(period)

func _process(delta):
	period_check -= delta
	if period_check <= 0:
		refresh_period()
		period_check = 20.

func target_object(id):
	return objects.get(id,seat_targets.get(id))

func marker_for(obj):
	return markers.get(obj.get_meta("id", "")) if obj else null

func approach_point(obj):
	var marker = marker_for(obj)
	return marker.get_node(marker.get_meta("approach")).global_position

func seat_for(obj, actor):
	var marker = marker_for(obj)
	if not marker or not marker.has_meta("seat"): return {}
	var pose = marker.get_node(marker.get_meta("seat")).global_transform
	# Capacity and cushion centres are derived from the furniture collision envelope.
	var width := 0.
	for shape in obj.get_children():
		if shape is CollisionShape3D and shape.shape is BoxShape3D:
			width = shape.shape.size.x
			break
	var shared = not marker.get_node(marker.get_meta("seat")).has_meta("id") and width >= 2 * MIN_CUSHION_WIDTH
	var other = get_node_or_null("Companion" if actor.name == &"Player" else "Player")
	if not shared and other and other.seat_object == obj: return {}
	if shared:
		pose.origin += pose.basis.x * width * (.25 if actor.name == &"Companion" else -.25)
	return {"pose":pose}

func spawn_actors():
	var player = preload("res://player.gd").new()
	player.name = "Player"
	player.position = Vector3(0,0,2.8)
	add_child(player)

	var companion = preload("res://companion.gd").new()
	companion.name = "Companion"
	companion.position = Vector3(-1,0,-2)
	add_child(companion)

	var bridge = preload("res://bridge.gd").new()
	bridge.name = "Bridge"
	add_child(bridge)
