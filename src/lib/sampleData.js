import { uid } from './helpers'

const mkSessions = (n, startDate) => {
  const s = []
  const start = startDate ? new Date(startDate) : new Date("2025-01-01")
  for (let i = 0; i < n; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i * 7 + Math.floor(Math.random() * 4))
    if (d > new Date()) break
    s.push({ id: uid(), date: d.toISOString().split("T")[0] })
  }
  return s
}

export const mkClients = () => [
  {id:uid(),name:"Alexandre Mestre",status:"active",gender:"male",phone:"+351918262013",email:"alexandremestre1975@gmail.com",startDate:"2025-05-01",endDate:"2026-04-02",source:"studio",sub:"12m",credits:48,used:32,bonus:0,rem:16,notes:"",nif:"",birthDate:"1975-06-15",contraindications:"",medicalNotes:"",sessions:mkSessions(32,"2025-05-01"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Ana Neto",status:"active",gender:"female",phone:"+351937080240",email:"anammmneto@gmail.com",startDate:"2024-09-01",endDate:"2025-08-03",source:"studio",sub:"12m",credits:48,used:30,bonus:0,rem:18,notes:"renov.",nif:"",birthDate:"1988-03-12",contraindications:"",medicalNotes:"",sessions:mkSessions(30,"2024-09-01"),suspensionHistory:[],renewalHistory:[{id:uid(),date:"2024-09-01",type:"12m",status:"renewed"}]},
  {id:uid(),name:"Aurelie Defer",status:"active",gender:"female",phone:"+351938639704",email:"aurelie.defer81@gmail.com",startDate:"2025-04-01",endDate:"2026-03-03",source:"",sub:"12m",credits:48,used:47,bonus:48,rem:49,notes:"",nif:"",birthDate:"1981-07-22",contraindications:"",medicalNotes:"",sessions:mkSessions(47,"2025-04-01"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Christelle Bacou",status:"active",gender:"female",phone:"+351968490989",email:"christellebacou@gmail.com",startDate:"2025-03-30",endDate:"2026-03-01",source:"",sub:"12m",credits:48,used:24,bonus:48,rem:72,notes:"",nif:"",birthDate:"1990-11-05",contraindications:"Probl\u00e8mes lombaires",medicalNotes:"\u00c9viter exercices de flexion intense",sessions:mkSessions(24,"2025-03-30"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Lauren Grant",status:"active",gender:"female",phone:"+351963089281",email:"laurengrant@me.com",startDate:"2025-11-24",endDate:"2026-05-11",source:"",sub:"6m",credits:24,used:4,bonus:0,rem:20,notes:"",nif:"",birthDate:"1995-02-28",contraindications:"",medicalNotes:"",sessions:mkSessions(4,"2025-11-24"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Claudia Rocha",status:"active",gender:"female",phone:"+351939602925",email:"claudia.rocha@inetum.com",startDate:"",endDate:"",source:"",sub:"p20",credits:20,used:17,bonus:0,rem:3,notes:"",nif:"",birthDate:"",contraindications:"",medicalNotes:"",sessions:mkSessions(17,"2025-01-15"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Cristiana Cristal",status:"suspended",gender:"female",phone:"+351964675073",email:"cristianacristal@hotmail.com",startDate:"2024-11-01",endDate:"2025-10-03",source:"studio",sub:"12m",credits:48,used:31,bonus:0,rem:17,notes:"",nif:"",birthDate:"1986-04-18",contraindications:"Pacemaker \u2014 EMS interdit",medicalNotes:"Consulter m\u00e9decin avant reprise",sessions:mkSessions(31,"2024-11-01"),suspensionHistory:[{id:uid(),from:"2025-04-01",to:"2025-05-31",reason:"Voyage",daysAdded:61}],renewalHistory:[]},
  {id:uid(),name:"Carina Lopes",status:"inactive",gender:"female",phone:"+351961500792",email:"carina.levy@hotmail.com",startDate:"2024-06-01",endDate:"2025-05-03",source:"",sub:"12m",credits:48,used:35,bonus:0,rem:13,notes:"",nif:"",birthDate:"1992-08-30",contraindications:"",medicalNotes:"",sessions:mkSessions(35,"2024-06-01"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Carla Marques",status:"inactive",gender:"female",phone:"+351961946664",email:"",startDate:"",endDate:"",source:"",sub:"p10",credits:10,used:7,bonus:0,rem:3,notes:"",nif:"",birthDate:"",contraindications:"",medicalNotes:"",sessions:mkSessions(7,"2025-02-01"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"David Pell\u00e9",status:"inactive",gender:"male",phone:"+351929135482",email:"",source:"studio",sub:"p10",credits:10,used:6,bonus:0,rem:4,notes:"",nif:"",birthDate:"",contraindications:"",medicalNotes:"",sessions:mkSessions(6,"2025-03-01"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Magali Vincent",status:"active",gender:"female",phone:"+33620521523",email:"magalicalmettes@gmail.com",startDate:"2025-11-12",endDate:"2026-04-29",source:"studio",sub:"6m",credits:24,used:6,bonus:0,rem:18,notes:"",nif:"",birthDate:"1979-12-03",contraindications:"Grossesse r\u00e9cente",medicalNotes:"Programme adapt\u00e9 post-partum",sessions:mkSessions(6,"2025-11-12"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Marina Teixeira",status:"active",gender:"female",phone:"+351966110155",email:"carlamarinateixeira@gmail.com",startDate:"2024-09-14",endDate:"2025-08-16",source:"studio",sub:"12m",credits:48,used:38,bonus:0,rem:10,notes:"",nif:"",birthDate:"1987-05-20",contraindications:"",medicalNotes:"",sessions:mkSessions(38,"2024-09-14"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Stefan Georges",status:"active",gender:"male",phone:"+491636338196",email:"stefan.davidegeorge@gmail.com",startDate:"2023-07-11",endDate:"",source:"studio",sub:"p20",credits:20,used:12,bonus:0,rem:8,notes:"",nif:"",birthDate:"1990-01-15",contraindications:"",medicalNotes:"",sessions:mkSessions(12,"2024-06-01"),suspensionHistory:[],renewalHistory:[]},
  {id:uid(),name:"Isabel S\u00e1 Nogueira",status:"active",gender:"female",phone:"+351963359000",email:"lufo@isabelsanogueira.com",startDate:"2025-03-01",endDate:"2026-01-31",source:"",sub:"12m",credits:48,used:8,bonus:0,rem:40,notes:"",nif:"",birthDate:"1970-09-08",contraindications:"Hypertension control\u00e9e",medicalNotes:"Surveillance pression art\u00e9rielle",sessions:mkSessions(8,"2025-03-01"),suspensionHistory:[],renewalHistory:[]},
]

export const mkLeads = () => [
  {name:"Rita Motta Guedes",email:"rita.gds@gmail.com",phone:"+351910783934",stage:"notContacted",notes:"",date:""},
  {name:"Carla Marques",email:"carla70mjm@gmail.com",phone:"+351967395159",stage:"notContacted",notes:"",date:""},
  {name:"Jose Barata",email:"jose.barata.carrasqueira@gmail.com",phone:"+351919975168",stage:"notContacted",notes:"",date:""},
  {name:"Rita Leandro",email:"ritaferreiraleandro@gmail.com",phone:"+351939900986",stage:"notContacted",notes:"",date:""},
  {name:"Natacha Cabral",email:"natacha.cabral@gmail.com",phone:"+351919194091",stage:"notContacted",notes:"",date:""},
  {name:"Ant\u00f4nio Salgado",email:"salgadotone7@gmail.com",phone:"+351916111082",stage:"notContacted",notes:"",date:""},
  {name:"Bruno Santos",email:"bsergio@sapo.pt",phone:"+351910992393",stage:"notContacted",notes:"",date:""},
  {name:"Patricia Teza",email:"patriciasilvasef@hotmail.com",phone:"+351933140316",stage:"sessionBooked",notes:"",date:"2025-08-26"},
  {name:"Laura Francisco",email:"jaurafrancisco@gmail.com",phone:"+351933665924",stage:"sessionBooked",notes:"10 set",date:"2025-08-28"},
  {name:"Isabel Coelho",email:"isabelcoelho1102@gmail.com",phone:"+351916337789",stage:"sessionBooked",notes:"24 sep",date:"2025-08-30"},
  {name:"Valentina Nascimento",email:"valentina.nascimentopt@gmail.com",phone:"+351967929429",stage:"sessionBooked",notes:"17 sep",date:"2025-10-09"},
  {name:"S\u00f3nia Silva",email:"soniasilvagodinho@gmail.com",phone:"+351969361112",stage:"sessionDone",notes:"",date:""},
  {name:"Leonardo Oliveira",email:"leonardojmj2020@gmail.com",phone:"+351937320291",stage:"sessionDone",notes:"",date:""},
  {name:"Helena de Aboim",email:"haboim17@gmail.com",phone:"+351933560704",stage:"sessionDone",notes:"",date:""},
  {name:"Marilia Freire",email:"marilia_silva31@hotmail.com",phone:"+351913987189",stage:"sessionDone",notes:"",date:"2025-08-25"},
  {name:"Carla Caeiro",email:"carla.caeiro@sapo.pt",phone:"+351969562946",stage:"converted",notes:"",date:""},
  {name:"Teresa Ara\u00fajo",email:"araujteresa@gmail.com",phone:"+351917608893",stage:"converted",notes:"",date:""},
  {name:"Carla Mascarenhas",email:"carlamascarenhascerveira@gmail.com",phone:"+351912164106",stage:"converted",notes:"",date:""},
  {name:"Edjane Almeida",email:"edjane.almeida2802@gmail.com",phone:"+351911963454",stage:"converted",notes:"13 sep",date:"2025-09-11"},
  {name:"Fernanda Caldas",email:"fernandasn.caldas@gmail.com",phone:"+351918882820",stage:"converted",notes:"",date:"2026-01-13"},
].map(l => ({id:uid(),source:l.source||"meta_ads",contactAttempts:0,createdAt:l.date||"2025-06-01",lastActionDate:l.date||"",nextCallback:"",address:"",birthDate:"",nif:"",origin:"",followUpStatus:"",...l}))

export const mkTrials = () => [
  {name:"Mazin Andrea",email:"Andrea.mzn1@gmail.com",phone:"+33638905590",date:"2023-09-28",address:"6DTO rua Jo\u00e3o chagas",birthDate:"1994-08-14",nif:"",origin:"",followUpStatus:"msgSent",notes:""},
  {name:"Rita M\u00fcller",email:"Ritinham70@gmail.com",phone:"+351918230197",date:"2023-09-29",address:"CC marques de Abrantes 107, 4E",birthDate:"1970-11-27",nif:"",origin:"",followUpStatus:"interested",notes:""},
  {name:"Nyssa Sharma",email:"nyssa.7@hotmail.com",phone:"+351915499313",date:"2023-09-29",address:"Rua Carlos da Maia 34",birthDate:"1989-01-02",nif:"285895060",origin:"",followUpStatus:"",notes:""},
  {name:"Giulia Corsi",email:"Giu.corsi@gmail.com",phone:"+351912708876",date:"2023-10-03",address:"Rua pereira e sousa 35 3b",birthDate:"1990-06-13",nif:"306200414",origin:"",followUpStatus:"noAnswer",notes:""},
  {name:"Katia Moura Rodrigues",email:"Katiarodrigueskr@gmail.com",phone:"+351969736081",date:"2023-10-10",address:"Rua Freitas Gazul 30 apt 1 dto",birthDate:"1982-04-23",nif:"310753589",origin:"Recomenda\u00e7\u00e3o",followUpStatus:"interested",notes:""},
  {name:"Sandra Pires",email:"Sandra.Marques.pites@gmail.com",phone:"+351918738805",date:"2023-10-17",address:"Largo do giestal 13 2 dito",birthDate:"1972-02-01",nif:"204611083",origin:"",followUpStatus:"msgSent",notes:""},
  {name:"Filipa Antunes",email:"filipaconded@gmail.com",phone:"+351913288291",date:"2023-11-23",address:"",birthDate:"1993-12-24",nif:"",origin:"",followUpStatus:"comingBack",notes:"Vai vir com classpass"},
  {name:"Delfina Victoria Vich",email:"delfina.vich@gmail.com",phone:"+351912000030",date:"2024-02-24",address:"",birthDate:"",nif:"",origin:"",followUpStatus:"msgSent",notes:"Menssagem enviada"},
  {name:"Ronald Chagoury",email:"ronald.chagoury@gmail.com",phone:"+351912000031",date:"2024-03-05",address:"",birthDate:"",nif:"",origin:"Est\u00fadio",followUpStatus:"interested",notes:"Vai comprar por sess\u00e3o"},
  {name:"Cremilde Pratas",email:"cremildepratas@gmail.com",phone:"+351962027378",date:"2026-03-07",address:"",birthDate:"",nif:"",origin:"Redes sociais",followUpStatus:"",notes:""},
].map(tr => ({id:uid(),source:"studio",stage:"sessionDone",contactAttempts:tr.followUpStatus?1:0,createdAt:tr.date,lastActionDate:tr.followUpStatus?tr.date:"",nextCallback:"",...tr}))
