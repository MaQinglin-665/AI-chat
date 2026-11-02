extends RefCounted
# Read NDJSON only after a complete newline so split UTF-8 codepoints survive.
static func run(bridge,payload,epoch):
	var client:=HTTPClient.new()
	if client.connect_to_host("127.0.0.1",bridge.port)!=OK:return {}
	var requested=false
	var pending:=PackedByteArray()
	var deadline=Time.get_ticks_msec()+40000
	while bridge.is_inside_tree() and bridge.voice_epoch==epoch and Time.get_ticks_msec()<deadline:
		client.poll()
		match client.get_status():
			HTTPClient.STATUS_CONNECTED:
				if requested:break
				var origin="http://127.0.0.1:%d"%bridge.port
				var error=client.request(HTTPClient.METHOD_POST,"/api/room/turn",["Origin: "+origin,"Authorization: Bearer "+bridge.token,"Content-Type: application/json"],JSON.stringify(payload))
				if error!=OK:break
				requested=true
			HTTPClient.STATUS_BODY:
				if client.get_response_code()!=200:break
				pending.append_array(client.read_response_body_chunk())
				if pending.size()>32768:break
				var nl=pending.find(10)
				while nl>=0:
					var item=JSON.parse_string(pending.slice(0,nl).get_string_from_utf8())
					pending=pending.slice(nl+1)
					if item is Dictionary:
						if item.has("line"):bridge.enqueue_line(item.line,epoch)
						if item.has("done"):
							client.close()
							return item.done
					nl=pending.find(10)
			HTTPClient.STATUS_CONNECTING,HTTPClient.STATUS_REQUESTING,HTTPClient.STATUS_RESOLVING:pass
			_:break
		await bridge.get_tree().process_frame
	client.close()
	return {}
