extends "res://tools/phase3_tour.gd"
# Only drive user input. Record the same spatial mix sent to the speakers.
var recorder := AudioEffectRecord.new()
func setup():
	super.setup()
	capture.audio_listener_enable_3d=true
	AudioServer.add_bus_effect(0,recorder)
	recorder.set_recording_active(true)
	print("ROOM_CAPTURE_START ",Time.get_ticks_msec())

func _physics_process(dt):
	if not p: return false
	var t=(Time.get_ticks_msec()-started)/1000.
	if t>2 and t<8: walk_to(Vector3(.2,0,1.25),dt)
	if t>24 and once("hello"): p.send_message("晚上好，今天想在房间里做点什么？")
	if t>65 and once("books"): p.send_message("去书架看看有什么书吧。")
	if t>109 and once("window"): p.send_message("窗外现在是什么样子呀？")
	if t>150 and once("sit"): p.send_message("我想坐一会儿，你去沙发坐一下吧。")
	if t>187 and once("listen"): p.send_message("刚才看的书，你想聊点什么？")
	if t>220 and once("third"): press(KEY_V)
	if t>220 and t<230: walk_to(Vector3(1.2,0,2.4),dt)
	face(ai.position+Vector3.UP*(1.32 if ai.sitting else 1.42))
	return false

func _process(delta):
	if p and Time.get_ticks_msec()-started>=304700 and once("mix"):
		recorder.set_recording_active(false)
		recorder.get_recording().save_to_wav(OS.get_environment("ROOM_FRAMES").path_join("room-mix.wav"))
	return super._process(delta)
