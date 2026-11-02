extends AudioStreamPlayer3D
# The analyser sees this voice alone; sample only after estimated speaker output.
var actor
var muted := false
var serial := 0
var bus_index := -1
var began := 0
var shape_indices := {}
var analyser
var mix_probe := AudioEffectCapture.new()
var output_onset := -1
var envelope := 0.
var mouth := 0.
var cues := []
var pcm := PackedByteArray()
var pcm_channels := 1
var pcm_rate := 0
var measured := false
var started_speech := false

func _ready():
	actor=get_parent()
	position.y=1.35
	unit_size=3.0
	max_distance=16.
	attenuation_model=AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	AudioServer.add_bus()
	bus_index=AudioServer.bus_count-1
	AudioServer.set_bus_name(bus_index,"RoomVoice"+str(get_instance_id()))
	bus=AudioServer.get_bus_name(bus_index)
	var effect=AudioEffectSpectrumAnalyzer.new()
	effect.fft_size=AudioEffectSpectrumAnalyzer.FFT_SIZE_256
	AudioServer.add_bus_effect(bus_index,effect)
	AudioServer.add_bus_effect(bus_index,mix_probe)
	analyser=AudioServer.get_bus_effect_instance(bus_index,0)
	var presets := {"A":"aa","I":"ih","U":"ou","E":"ee","O":"oh"}
	for vowel in presets:
		var bindings = preload("res://avatar_loader.gd").expression_bindings(actor.body,presets[vowel])
		if not bindings.is_empty(): shape_indices[vowel]=bindings



func _exit_tree():
	if bus_index>=0:
		var id=AudioServer.get_bus_index(bus)
		if id>0: AudioServer.remove_bus(id)

func _unhandled_key_input(event):
	if event is InputEventKey and event.keycode==KEY_M and event.pressed and not event.echo and not actor.player.entry.visible:
		muted=not muted
		AudioServer.set_bus_mute(bus_index,muted)
		actor.caption.set_muted(muted)

func utter(text):
	serial+=1
	var id=serial
	stop()
	started_speech=false
	measured=false
	reset_mouth()
	var split=RegEx.new()
	split.compile("[^。！？!?；;，,\\n]+[。！？!?；;，,]*")
	var sentences=split.search_all(text)
	for sentence in sentences:
		if id!=serial: return
		# Prepare the next clause while the current one is audible.
		if not await play_sentence(sentence.get_string(),id): return

func play_sentence(text:String,id:int) -> bool:
	var bridge=actor.get_parent().get_node("Bridge")
	if bridge.token.is_empty(): return false
	var http=HTTPRequest.new()
	http.use_threads=true
	http.timeout=35.
	add_child(http)
	var headers=["Authorization: Bearer "+bridge.token,"Content-Type: application/json","Origin: http://127.0.0.1:%d"%bridge.port]
	http.max_redirects=0
	if http.request("http://127.0.0.1:%d/api/tts"%bridge.port,headers,HTTPClient.METHOD_POST,JSON.stringify({"text":text}))!=OK:
		http.queue_free()
		return false
	actor.caption.extend_for_audio(http.timeout)
	var response=await http.request_completed
	http.queue_free()
	if id!=serial: return false
	if response[1]!=200:
		actor.caption.fallback_to_text()
		return false
	var data: PackedByteArray=response[3]
	var audio: AudioStream
	if data.slice(0,4).get_string_from_ascii()=="RIFF":
		audio=AudioStreamWAV.load_from_buffer(data)
	elif data.slice(0,4).get_string_from_ascii()=="OggS":
		audio=AudioStreamOggVorbis.load_from_buffer(data)
	else:
		audio=AudioStreamMP3.load_from_buffer(data)
	if not audio:
		actor.caption.fallback_to_text()
		return false
	var next_cues=[]
	for header in response[2]:
		if header.to_lower().begins_with("x-room-visemes:"):
			var parsed=JSON.parse_string(header.substr(header.find(":")+1))
			if parsed is Array: next_cues=parsed
		if header.to_lower().begins_with("x-room-match:"): print("ROOM_VOICE_MATCH ",header.substr(header.find(":")+1).strip_edges())
		if header.to_lower().begins_with("x-room-voice:"):
			print("ROOM_VOICE ",header.substr(header.find(":")+1).strip_edges().uri_decode())
	while playing and id==serial: await get_tree().process_frame
	if id!=serial: return false
	cues=next_cues
	actor.caption.extend_for_audio(audio.get_length())
	start_audio(audio)
	actor.caption.extend_for_audio(audio.get_length()+AudioServer.get_output_latency())
	return true

func start_audio(audio: AudioStream):
	stop()
	reset_mouth()
	pcm=PackedByteArray()
	pcm_rate=0
	if audio is AudioStreamWAV and audio.format==AudioStreamWAV.FORMAT_16_BITS:
		pcm=audio.data
		pcm_channels=2 if audio.stereo else 1
		pcm_rate=audio.mix_rate
	# Godot may keep the last FFT when a silent bus falls asleep.
	AudioServer.remove_bus_effect(bus_index,0)
	var fresh=AudioEffectSpectrumAnalyzer.new()
	fresh.fft_size=AudioEffectSpectrumAnalyzer.FFT_SIZE_256
	AudioServer.add_bus_effect(bus_index,fresh,0)
	mix_probe.clear_buffer()
	output_onset=-1
	analyser=AudioServer.get_bus_effect_instance(bus_index,0)
	stream=audio
	began=Time.get_ticks_msec()
	measured=false
	started_speech=true
	play()
	print("ROOM_AUDIO play_ms=",began," duration=",audio.get_length()," output_latency=",AudioServer.get_output_latency())

func pcm_level(seconds: float):
	# Only inspect samples that have reached the output. The trailing window
	# avoids anticipating consonants or visemes during leading silence.
	var end=mini(int(seconds*pcm_rate),pcm.size()/(2*pcm_channels))
	var first=maxi(0,end-ceili(pcm_rate*.012))
	var energy=0.
	var n=0
	for frame in range(first,end,3):
		var sample_value=pcm.decode_s16(frame*2*pcm_channels)/32768.
		energy+=sample_value*sample_value
		n+=1
	return sqrt(energy/maxi(n,1))

func reset_mouth():
	for vowel in shape_indices: apply_vowel(vowel,0)
	mouth=0.

func _process(delta):
	var clock_seconds=(Time.get_ticks_msec()-began)*.001
	var cursor=minf(clock_seconds,get_playback_position()+AudioServer.get_time_since_last_mix())-AudioServer.get_output_latency()
	var buffered=mix_probe.get_frames_available()
	if buffered>0:
		var mixed=mix_probe.get_buffer(buffered)
		if playing and output_onset<0:
			for i in mixed.size():
				if mixed[i].length()>.002:
					var age=(mixed.size()-i)/AudioServer.get_mix_rate()+AudioServer.get_time_since_last_mix()
					output_onset=maxi(began,Time.get_ticks_msec()-roundi(1000.*age))+roundi(AudioServer.get_output_latency()*1000.)
					print("ROOM_MIX onset_ms=",output_onset)
					break
	var audible=playing and not muted and cursor>=0. and output_onset>=0 and Time.get_ticks_msec()>=output_onset
	var level=0.
	if audible and analyser:
		if pcm_rate>0:
			var rms=pcm_level(cursor)
			level=clampf(rms*10.,0.,1.) if rms>.004 else 0.
		else:
			level=clampf(analyser.get_magnitude_for_frequency_range(90,3400).length()*11.,0.,1.)
	var target="A"
	if audible:
		var ms=1000.*cursor
		for cue in cues:
			if cue is Array and cue.size()==2 and float(cue[0])<=ms and str(cue[1]) in shape_indices: target=str(cue[1])
	mouth=lerpf(mouth,level,1-exp(-delta*38))
	for vowel in shape_indices: apply_vowel(vowel,0.)
	if audible and shape_indices.has(target): apply_vowel(target,mouth)
	envelope=lerpf(envelope,1. if audible else 0.,1-exp(-delta*3.))
	actor.gaze.speech_envelope=envelope
	if audible and mouth>.012 and not measured:
		measured=true
		print("ROOM_MOUTH onset_ms=",Time.get_ticks_msec()," estimated_audio_onset_ms=",began+roundi(AudioServer.get_output_latency()*1000.))
	if started_speech and not playing:
		started_speech=false
		actor.caption.audio_finished()

func apply_vowel(vowel, weight):
	for bind in shape_indices[vowel]: bind[0].set_blend_shape_value(bind[1],weight*bind[2])
