var respecConfig = {
   "group": "webrtc",
    github: {
      repoURL: "https://github.com/w3c/webrtc-extensions/",
      branch: "main"
    },
  latestVersion: null,
    "xref": ["html", "webidl", "webrtc", "hr-time", "mediacapture-streams", "webrtc-stats", "infra", "dom"],
    "specStatus": "ED",
    editors:  [
      //              { name: "Your Name", url: "http://example.org/",
      //                company: "Your Company", companyURL: "http://example.com/" },
      { name: "Bernard Aboba", company: "Microsoft Corporation",
        w3cid: "65611"
      }
    ],
    formerEditors: [
      { name: "Henrik Boström", company: "Google", w3cid: "96936", retiredDate: "2021-02-01" }
    ],
    authors: [
    ],
    wgPublicList: "public-webrtc",
    otherLinks: [
      {
        key: "Participate",
        data: [
          {
            value: "Mailing list",
            href: "https://lists.w3.org/Archives/Public/public-webrtc/"
          }
        ]
      }
    ],
    localBiblio: {
      "IANA-STUN-6": {
        "title": "STUN Error Codes",
        "href": "https://www.iana.org/assignments/stun-parameters/stun-parameters.xhtml#stun-parameters-6",
        "publisher": "IANA"
      },
      "CRYPTEX": {
	"aliasOf": "RFC9335"
      },
      "RTP-EXT-CAPTURE-TIME": {
        "title": "Absolute Capture Timestamp RTP header extension",
        "href": "https://www.ietf.org/archive/id/draft-ietf-avtcore-abs-capture-time-00.html",
        "authors": [
          "H. Alvestrand"
        ],
        "status": "6 February 2025. Internet Draft (work in progress)",
        "publisher": "IETF"
      }
    }
}
