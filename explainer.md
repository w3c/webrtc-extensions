## Explainer

### Introduction

This document explains [extensions to the WEBRTC specification](https://w3c.github.io/webrtc-extensions). This document contains a number of sections, each of which contains design details to one specific extension.

### RTCRtpContributingSource extensions on captureTimestamp and senderCaptureTimeOffset

Authors:
minyue@chromium.org
hbos@chromium.org
chxg@google.com

Participate
https://www.chromestatus.com/feature/5728533701722112

#### Abstract

This section explains the two new data fields in RTCRtpContributingSource, namely captureTimestamp and senderCaptureTimeOffset, see [here](https://w3c.github.io/webrtc-extensions/#rtcrtpcontributingsource-dictionary). They are introduced for audio-video synchronization and end-to-end delay measurements. These measurements are quality indices of a real-time communication system, and they can be well used for monitoring the performance of such a system and A/B testing of new features. The audio-video synchronization measurement may also be used for achieving audio-video synchronization by adjusting the playout delay of the audio or the video stream accordingly.

The solution to audio-video synchronization and end-to-end delay measurements described here is particularly desired by systems, where an intermediate stream regenerator that terminates the streams originating from senders is involved. One example of this is an audio mixer.

#### Introduction

In simple real-time communication systems, which involves only a sender and a receiver, the RTCP scheme [RFC3550] allows estimation of round-trip time and thus end-to-end delay.
However, in a more sophisticated system, where an intermediate stream regenerator is involved, the estimation of end-to-end delay becomes more difficult. For example, if audio mixing is performed on the server side, the server terminates inbound media streams, processes the media data, and then generates new outbound media streams with fresh synchronization information.

The solution proposed in this document is based on a new RTP header extension, absolute capture time, which contains two data fields:
 * an absolute capture timestamp, which is stamped by the original capturer, and is supposed to be received untouched by the end receivers.
 * an estimated clock offset with respect to the capturer's clock, which is supposed to be read and updated by every intermediate sender.

With the absolute capture timestamps, end receivers can accurately measure how synchronized the audio and video tracks are. With the `estimated clock offset`, which gets updated at each intermediate hop, end receivers can estimate their clock offset with respect to the capturer's clock, and then, together with the absolute capture timestamp, measure the end-to-end delay.

The absolute capture time RTP header extension is defined [here](https://webrtc.org/experiments/rtp-hdrext/abs-capture-time).

The two new data fields in RTCRtpContributingSource are to surface the two data fields in the absolute capture time RTP header extension.

#### Goals

 * Facilitate calculation of audio video synchronization performance in real-time communication systems.
 * Facilitate calculation of end-to-end delay in real-time communication systems, particularly those that involve intermediate stream regenerators.

##### Non-goals

This proposal does not aim for improving the accuracy of end-to-end delay measurement in real-time communication systems that can already measure it based on RTCP based schemes.

#### [API 1]: captureTimestamp

This specification adds captureTimestamp, type of DOMHighResTimeStamp, to the RTCRtpContributingSource dictionary. This surfaces the absolute capture timestamp in the absolute capture time RTP header extension, when it is present or can be extrapolated from previously received data, for the last rendered audio or video frame. It can be used for measuring audio video synchronization performance as illustrated in the following example code:

    [receiverAudio, receiverVideo] = peerconnection.getReceivers();

    latestCaptureTimestampAudio = receiverAudio.getSynchronizationSources()[0].captureTimeStamp;
    latestCaptureTimestampVideo = receiverVideo.getSynchronizationSources()[0].captureTimeStamp;

    synchronizationError = latestCaptureTimestampAudio - latestCaptureTimestampVideo;

#### [API 2]: senderCaptureTimeOffset

This specification also adds senderCaptureTimeOffset, type of DOMHighResTimeStamp, to the RTCRtpContributingSource dictionary. In this context, the sender refers to the system that directly sends RTP and RTCP packets to the receiver, and thus the sender-receiver path only represents the "last hop" in a system that involves intermediate stream regenerators.

An example code to use captureTimestamp and senderCaptureTimeOffset to calculate end-to-end delay:

    receiver = peerconnection.getReceivers()[0];
    csrc = receiver.getSynchronizationSources()[0];
    latestCaptureTimestamp = csrc.captureTimeStamp;
    latestSenderCaptureTimeOffset = csrc.SenderCaptureTimeOffset;
    receiverTimestamp = csrc.timestamp;

    // Calculates sender-receiver clock offset from stats.
    stats = peerconnection.getStats();
    remoteOutboundRtpStats = getRequiredStats(stats, "remote-outbound-rtp");
    remoteInboundRtpStats = getRequiredStats(stats, "remote-inbound-rtp")
    senderReceiverTimeOffset = remoteOutboundRtpStats.timestamp - (remoteOutboundRtpStats.remoteTimestamp + remoteInboundRtpStats.roundTripTime / 2);

    // Calcuates sender-capturer clock offset.
    captureReceiverTimeOffset = senderReceiverTimeOffset + latestSenderCaptureTimeOffset;

    receiverCaptureTimestamp = latestCaptureTimestamp + captureReceiverTimeOffset;
    endToEndDelay = receiverTimestamp - receiverCaptureTimestamp.

#### Detailed design discussion

##### [Tricky design choice 1]: multiple ways to surface end-to-end delay

The proposed solution is, as [API 2], to surface the sender-capture time offset as the raw data existing the absolute capture time RTP header extension. Then the calculation of end-to-end delay requires other data, as depicted in the code example in [API 2]. Alternatively, we can surface another derived quality, even just the end-to-end delay. However, for the sake of clarity and testability in the specification, it would be best to report the raw data.

#### Considered alternatives

We believe that given the choice of signaling protocol, the API suggested here is obvious. This section will sketch some of the other proposals for signaling protocols that have been considered and rejected over the development of this proposal.

##### [Alternative 1] Intermediate servers bake round-trip-time from capturer in its RTCP.

If an intermediate server includes the one-way delay from the original capturer in the NTP timestamps in its RTCP packets, the end receiver does not have to care if there was a server in-between or not. The proposed way of updating the `estimated clock offset` with respect to the capturer's clock, as the second data in the absolute capture time RTP header extension, is based on the same principle.

However, without the original capture timestamp, this method may fail if the intermediate server regenerates the stream and applies RTP timestamping that does not strictly follow the capturer's clock rate. A discussion of this scheme can be found [here](https://github.com/w3c/webrtc-stats/issues/537).

##### [Alternative 2] Audio Timing Header Extension

In WebRTC, [video-timing](https://webrtc.org/experiments/rtp-hdrext/video-timing/) has been proposed as an experimental RTP header extension. We rejected the idea of reusing it for audio or adding an audio version of it, since it has a duration-based design that requires its header extension to be sent with every frame, hence consuming significantly more bandwidth than our timestamp-based design.

##### [Alternative 3] [RFC5484]: SMPTE Time-Code

We rejected the proposal in [RFC5484] to use SMPTE time-codes. It seems needlessly complex for our use cases. It would also only help us solve the desynchronization metric problem, and not provide us with a solution for a one-way delay metric.

##### [Alternative 4] [RFC6051]: Rapid Synchronisation of RTP Flows

We rejected the proposals in [RFC6051] since they cannot overcome the problem of synchronizing beyond mixers. The extended version of abs-capture-time does however borrow design elements from the RFC’s In-Band Delivery of Synchronisation Metadata section.

#### Stakeholder Feedback / Opposition

The proposal has been presented to W3C WG and browser implementers. While there is no signal from other implementers to implement this yet, the proposal has been reviewed without concerns raised.

Real applications, Google Hangouts and Meet, for example, have been asking for reliable audio video synchronization and end-to-end delay measurements for several years, which we can back up with [discussions](https://github.com/w3c/webrtc-stats/issues/158) from 2017.

#### References & acknowledgements

 * [RFC3550] Schulzrinne, H., Casner, S., Frederick, R. and V. Jacobson, "RTP: A
 Transport Protocl for Real-Time Applications", RFC 3550, July 2003.
 * [RFC5484] D. Singer, "Associating Time-Codes with RTP Streams", RFC 5484, March 2009.
 * [RFC6051] Perkins, C. and T. Schierl, "Rapid Synchronisation of RTP Flows", RFC 6051, November 2010.

Many thanks for valuable feedback and advice from:
Harald Alvestrand

### A new flag in RTCRtpEncodingParameters for adaptive packet rate

Authors:
minyue@chromium.org
eladalon@chromium.org
jakobi@google.com
hbos@chromium.org

Participate
https://www.chromestatus.com/feature/5752004691361792
https://github.com/w3c/webrtc-pc/issues/2300
https://github.com/w3c/webrtc-pc/issues/2309

#### Abstract
This document provides an API for enabling/disabling a sender in a real-time audio-video call to adapt its audio packet rate to better utilize the network connection between the sender and other participants.

#### Introduction
Congestion control is a common way for real-time audio-video conferencing to achieve a good performance [1], because, without it, the senders in a call may send too much data and congest the network, thus degrading call quality.

A common congestion control is to adapt the bitrate of the audio and/or the video streams according to an estimate of the link capacity of the network. This proposal is focused on the audio bitrate adaptation. The total bitrate of an audio stream equals

    total_birate = codec_bitrate + header_size * packet_rate,

An audio codec compresses audio into a sequence of packets, each representing a frame of the audio, and the duration of a trunk is referred to as the packet time. The average bitrate of these packets is the codec bitrate. Then, depending on the protocols used for transmission, various layers of headers can be added to the packets, as an example, RTP [RFC3550], TURN [RFC5766], UDP [RFC768] and IP. These headers account for a significant portion of the total bitrate. With a packet rate of 50 (packets per second), the header rate can be as high as 37.6 kbps, which is equivalent to a codec rate for delivering a high quality full-band audio.

Obviously, it is not ideal to only have a control on the codec bitrate. An efficient bitrate adaptation should also change the packet rate. The audio packet rate is analogous to the video frame rate, which also plays an important role in the video bitrate adaptation.

Despite the great value of adapting packet rate, it can be difficult to ship the feature as default, since it may introduce interoperability problems. Although there seems to be no specifications to force a fixed packet rate, some implementations may have taken it as an assumption and may fail or perform suboptimally. Therefore the proposal is to add a new flag, [adaptivePTime](https://w3c.github.io/webrtc-extensions/#dom-rtcrtpencodingparameters-adaptiveptime), in RTCRtpEncodingParameters, so that RTC applications can enable adaptive packet rate.

#### Goals
Allow a sender in a real-time audio-video call to choose whether or not to enable adaptive packet rate.

##### Non-goals
This document does not specify the algorithm for packet rate adaptation. The way to probe the link capacity and decide the packet rate is up to implementations.

#### [API]: adaptivePTime
Add adaptivePTime, type of boolean, to the RTCRtpEncodingParameters dictionary. It can be used for enabling adaptive packet rate. The choice of the name is due to the fact that ptime is a commonly used word for the audio packet interval, in the context of RTC, see, e.g., [RFC3264]. An example code of the usage of this flag follows:

    const pc = new RTCPeerConnection();
    const { sender } = pc.addTransceiver('audio', {
      sendEncodings: [{
        adaptivePTime: true
      }]
    });

#### Detailed design discussion
##### [Tricky design choice 1]: where to put the flag
As an alternative to RTCRtpEncodingParameters, RTCConfiguration was considered to be the host of the adaptivePTime flag, see discussions [1](https://github.com/w3c/webrtc-pc/issues/2300) and [2](https://github.com/w3c/webrtc-pc/issues/2309). Consensus was reached that RTCRtpEncodingParameters is a better place since the flag can be set on a per RTCRtpSender basis.

##### [Tricky design choice 2]: the format of the API
Another discussion was arround wether to expose the full control of packet rate, see [this](https://github.com/w3c/webrtc-pc/issues/2309), which was basically suggesting to use ptime, which had been proposed as a member in RTCRtpEncodingParameters, instead of adding a flag. This leaves the implementation of packet rate adaptation algorithm to the application developers, which gives them more flexibility but also brings difficulties to non-experts. Eventually, we decided to adopt the adaptivePTime, and also abondened the ptime, see [this](https://github.com/w3c/webrtc-pc/issues/2311), which means the implementation of packet rate adaptation algorithm is up to browsers.

#### Considered alternatives
##### [Alternative 1] SDP parameter ptime
We have considered using the parameter ptime as defined in Session Description Protocol (SDP)[RFC4566], and interpret the absence of it as allowing packet rate adaptation. But there are two problems

 * This will not guarantee interoperability, as the absence of ptime can be interpreted as a fixed default packet time by some implementations, e.g., Opus interpretes as a default packet time of 20 milliseconds [RFC7587].

 * The parameter ptime is a receiver preference, and therefore, we need to munge the SDP, if we want to control the sender. SDP munging is discouraged.

##### [Alternative 2] New SDP parameter
The effort of standardizing a new SDP parameter is large. Another drawback is that the SDP negotiation lacks dynamic nature, as it is difficult to re-configure during a call.

#### Stakeholder Feedback / Opposition
The need for an adaptive packet rate has been raised in a public discussion, and the concern on interoperability was also mentioned there. Mozilla has been involved in the discussions and seemed fine with the proposal.

#### References & acknowledgements

 * [1] G. Carlucci, L. De Cicco, S. Holmer and S. Mascolo, "Congestion Control for Web Real-Time Communication," in IEEE/ACM Transactions on Networking, vol. 25, no. 5, pp. 2629-2642, Oct. 2017.
 * [RFC3550] Schulzrinne, H., Casner, S., Frederick, R., and V. Jacobson, "RTP: A Transport Protocol for Real-Time Applications", STD 64, RFC 3550, July 2003.
 * [RFC768] Postel, J., "User Datagram Protocol", STD 6, RFC 768, August 1980.
 * [RFC5766] Mahy, R., Matthews, P., and J. Rosenberg, "Traversal Using Relays around NAT (TURN): Relay Extensions to Session Traversal Utilities for NAT (STUN)", RFC 5766, April 2010.
 * [RFC3264] Rosenberg, J. and H. Schulzrinne, "An Offer/Answer Model with Session Description Protocol (SDP)", RFC 3264, June 2002.
 * [RFC4566] Handley, M., Jacobson, V., and C. Perkins, "SDP: Session Description Protocol", RFC 4566, July 2006.
 * [RFC7587] Spittka, J., Vos, K., and JM. Valin, "RTP Payload Format for the Opus Speech and Audio Codec", RFC 7587, June 2015.

Many thanks for valuable feedback and advice from:
Harald Alvestrand, Jan-Ivar Bruaroey, Philipp Hancke, Roman Shpount and Justin Uberti (in alphabetical order).
