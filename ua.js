
var config = undefined;
var ua = undefined;
var session = undefined;

var options = undefined;
var client = undefined;
var ringbacktone = document.getElementById("ringbacktone");
var updateCallInfoInterval = setInterval(function () {
    if (session) {
        document.getElementById("session-status").innerHTML = session.status;

        switch (session.status) {
            case SESSION_STATUS.IDLE: {
                document.getElementById("call-status").innerHTML = "";
                document.getElementById("call-phone").innerHTML = "";
                document.getElementById("call-duration").innerHTML = "";
                document.getElementById("call-type").innerHTML = "";
                document.getElementById("call-id").innerHTML = "";
                break;
            }
            case SESSION_STATUS.ANSWERING: {
                document.getElementById("call-status").innerHTML = "đang trả lời";
                document.getElementById("call-phone").innerHTML = session.remoteIdentity.uri.normal.user;
                document.getElementById("call-duration").innerHTML = Math.floor(((new Date()) - session.startTime) / 1000);
                document.getElementById("call-type").innerHTML = (session.type === "inbound" ? "cuộc gọi vào" : "cuộc gọi ra");
                document.getElementById("call-id").innerHTML = session.id;

                break;
            }
            case SESSION_STATUS.INBOUND_RINGING:
            case SESSION_STATUS.OUTBOUND_RINGING: {
                document.getElementById("call-status").innerHTML = "đang đổ chuông";
                document.getElementById("call-phone").innerHTML = session.remoteIdentity.uri.normal.user;
                document.getElementById("call-type").innerHTML = (session.type === "inbound" ? "cuộc gọi vào" : "cuộc gọi ra");
                document.getElementById("call-id").innerHTML = session.id;
                break;
            }


            default:
                break;
        }
    }
}, 500);

const SESSION_STATUS = {
    IDLE: 9,
    OUTBOUND_STARTING: 1,
    OUTBOUND_RINGING: 2,
    INBOUND_RINGING: 4,
    ANSWERING: 12
}


function handlePageLoad() {
    var username = document.getElementById("input-username").value;
    var password = document.getElementById("input-password").value;
    var hostname = document.getElementById("input-hostname").value;
    var port = document.getElementById("input-port").value;
    var path = document.getElementById("input-path").value;
    config = {
        displayName: username,
        uri: `sip:${username}@${hostname}`,
        transportOptions: { wsServers: [`wss://${hostname}:${port}${path}`] },
        authorizationUsersip: username,
        password: password,
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: true,
                video: false
            },
        }
    };

    document.getElementById("extension-username").innerHTML = username;

    ua = new SIP.UA(config);

    ua.on('connected', function () {
        document.getElementById('ua-status').innerHTML = 'Connected (Unregistered)';
        document.getElementById('ua-status').style.color = "yellow";
    });

    ua.on('registered', function () {
        document.getElementById('ua-status').innerHTML = 'Connected (Registered)';
        document.getElementById('ua-status').style.color = "green";
    });

    ua.on('unregistered', function () {
        document.getElementById('ua-status').innerHTML = 'Connected (Unregistered)';
        document.getElementById('ua-status').style.color = "red";
    });

    ua.on('error', function (error) {
        console.log("ERROR", error);
    })

    ua.on('invite', function (s) {
        session = s;
        console.log(s)
        session.type = "inbound";
        showRingingCallElements();

        session.on('accepted', function () {
            console.log("ACCEPTED");
            showAnswerCallElements();
        });
        session.on('rejected', function () {
            console.log("REJECTED");
            showIdleCallElements();
        })
        session.on('cancel', function () {
            console.log("CANCEL");
            showIdleCallElements();
        })
        session.on('failed', function () {
            console.log("FAILED");
            showIdleCallElements();
        })
        session.on('bye', function () {
            console.log("BYE");
            showIdleCallElements();
        })

        console.log(session)
        session.on('trackAdded', function () {
            console.log("TRACK_ADDED");
            var pc = session.sessionDescriptionHandler.peerConnection;
            var player = document.getElementById("player");
            var remoteStream = new MediaStream();
            pc.getReceivers().forEach(function (receiver) {
                remoteStream.addTrack(receiver.track);
            });
            if (typeof player.srcObject !== 'undefined') {
                player.srcObject = remoteStream;
            } else if (typeof player.mozSrcObject !== 'undefined') {
                player.mozSrcObject = remoteStream;
            } else if (typeof player.src !== 'undefined') {
                player.src = URL.createObjectURL(remoteStream);
            } else {
                console.log('Error attaching stream to element.');
            }
            player.play();
        });
    })
}

function showIdleCallElements(callType) {
    document.getElementById('button-answer').style.display = "none";
    document.getElementById('button-hangup').style.display = "none";
    document.getElementById('button-transfer').style.display = "none";
    document.getElementById('input-phone-transfer').style.display = "none";
    document.getElementById('button-call').style.display = "inline";
    document.getElementById('input-phone').style.display = "inline";
}

function showAnswerCallElements(callType) {
    document.getElementById('button-answer').style.display = "none";
    document.getElementById('button-hangup').style.display = "inline";
    document.getElementById('button-transfer').style.display = "inline";
    document.getElementById('input-phone-transfer').style.display = "inline";
    document.getElementById('button-call').style.display = "none";
    document.getElementById('input-phone').style.display = "none";
}
function showRingingCallElements(callType) {
    document.getElementById('button-answer').style.display = "inline";
    document.getElementById('button-hangup').style.display = "none";
    document.getElementById('button-transfer').style.display = "none";
    document.getElementById('input-phone-transfer').style.display = "none";
    document.getElementById('button-call').style.display = "none";
    document.getElementById('input-phone').style.display = "none";
}

function handleButtonAnswerClick() {
    let option = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: true,
                video: false
            },
        }
    }
    session.accept(option);
}
function handleButtonHangupClick() {
    session.terminate();
}
function handleButtonTransferClick() {
    if (
        session.status === SESSION_STATUS.ANSWERING
    ) {
    	//nó đang không hiểu biến UserAgent.makeURI này. nên không register được
    var _session = ua.invite(`${document.getElementById("input-phone-transfer").value}@${document.getElementById("input-hostname").value}`,  {
                media: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                },
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                },
                // inviteWithoutSdp: true,
		       	// rel100: SIP.C.supported.SUPPORTED,
		       	activeAfterTransfer: false //die when the transfer is completed
            });
    	// const replacementSession = newInviter('22707', UserAgent.makeURI(`sip:${document.getElementById("input-phone-transfer").value}@${document.getElementById("input-hostname").value}`);
		session.refer(_session);
        // session.refer(`sip:${document.getElementById("input-phone-transfer").value}@${document.getElementById("input-hostname").value}`);
    }
}

function startRingbackTone() {
    console.log("playyyyyyy",ringbacktone)
    try { 
        ringbacktone.play(); 
        ringbacktone[0].play(); 
    }
    catch (e) { }
}

function stopRingbackTone() {
    try {  ringbacktone.pause(); }
    catch (e) { }
}

function handleButtonCallClick() {
    let status = SESSION_STATUS.IDLE;
    if (session) {
        status = session.status
    }
    if (status === SESSION_STATUS.IDLE) {
        session = ua.invite(
            document.getElementById('input-phone').value,
            {
                media: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                },
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                }
            }
        );
        session.type = "outbound";
        session.on('progress', function(response) {
            if (response.statusCode == 183 && response.body && session.hasOffer && !session.dialog) {
              if (!response.hasHeader('require') || response.getHeader('require').indexOf('100rel') === -1) {
                if (session.sessionDescriptionHandler.hasDescription(response.getHeader('Content-Type'))) {
                  // @hack: https://github.com/onsip/SIP.js/issues/242
                  session.status = SIP.Session.C.STATUS_EARLY_MEDIA
                  waitingForApplyingAnswer(response)
                }
              }
            }
          })
        showAnswerCallElements();
     
        session.on('accepted', function () {
            console.log("ACCEPTED");
            showAnswerCallElements();
        });
        session.on('rejected', function (s) {
            console.log("REJECTED");
            showIdleCallElements();
        })
        session.on('cancel', function () {
            console.log("CANCEL");
            showIdleCallElements();
        })
        session.on('failed', function (req) {
            switch (req.reasonPhrase) {
                case "Busy Here":
                    return (
                        console.log("Máy bận")
                    )
                case "Not Found":
                    return (
                        console.log("số không tồn tại")
                    )
                default:
                    break;
            }
            console.log("FAILED");
            showIdleCallElements();
        })
        session.on('bye', function () {
            console.log("BYE");
            showIdleCallElements();
        })

        session.on('unavailable', function () {
            console.log("UNAVAILABLE")
        })

        session.on('not found', function () {
            console.log("NOT_FOUND")
        })
        session.on('trackAdded', function () {
            console.log("TRACK_ADDED");
            var pc = session.sessionDescriptionHandler.peerConnection;
            var player = document.getElementById("player");
            var remoteStream = new MediaStream();

            pc.getReceivers().forEach(function (receiver) {
                remoteStream.addTrack(receiver.track);
            });

            if (typeof player.srcObject !== 'undefined') {
                player.srcObject = remoteStream;
            } else if (typeof player.mozSrcObject !== 'undefined') {
                player.mozSrcObject = remoteStream;
            } else if (typeof player.src !== 'undefined') {
                player.src = URL.createObjectURL(remoteStream);
            } else {
                console.log('Error attaching stream to element.');
            }
            player.play();
        });
    }
}

function waitingForApplyingAnswer(response) {
    let i = 1,
      clearTimer
  
    setTimeout(function check() {
      i++
      clearTimer = setTimeout(check, 10)
      if (session.hasAnswer || i > 14) {
        if (session.hasAnswer) {
          clearTimeout(clearTimer)
        } else if (i === 15) {
          clearTimeout(clearTimer)
          session.sessionDescriptionHandler.setDescription(response.body).catch((error) => {
            session.logger.warn(error)
            session.failed(response, C.causes.BAD_MEDIA_DESCRIPTION)
            session.terminate({ statusCode: 488, reason_phrase: 'Bad Media Description' })
          })
        }
      }
    }, 10)
  }
