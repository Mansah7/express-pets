
const nodemailer = require("nodemailer")
const sanitizeHtml = require("sanitize-html")
const validator = require("validator")
const petsCollection = require("../db").db().collection("pets")
const contactsCollection = require("../db").db().collection("contacts")
const { ObjectId } = require("mongodb")


const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {}
  }

exports.submitContact = async function(req, res, next) {
    if(req.body.secret.toUpperCase() !== "PUPPY") {
        console.log("Spam detected!")
        return res.json({message: "Sorry!"})
    }

    if(typeof req.body.name != "string") {
        req.body.name = ""
    }

    if(typeof req.body.email != "string") {
        req.body.email = ""
    }

    if(typeof req.body.comment != "string") {
        req.body.comment = ""
    }

    if(!validator.isEmail(req.body.email)) {
        console.log("Invalid email detected!")
        return res.json({message: "Sorry!"})
    }

    if(!ObjectId.isValid(req.body.petId)) {
        console.log("Invalid id!")
        return res.json({message: "Sorry!"}) 
    }

    req.body.petId = new ObjectId(req.body.petId)

    const doesPetExist = await petsCollection.findOne({_id: req.body.petId})

    if(!doesPetExist) {
        console.log("Pet does not exist!")
        return res.json({message: "Sorry!"}) 
    }

    const ourObject = {
        petId: req.body.petId,
        name: sanitizeHtml(req.body.name, sanitizeOptions),
        email: sanitizeHtml(req.body.email, sanitizeOptions),
        comment: sanitizeHtml(req.body.comment, sanitizeOptions)
    }
    console.log(ourObject)

    // Looking to send emails in production? Check out our Email API/SMTP product!
var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAILTRAPUSERNAME,
      pass: process.env.MAILTRAPPASSWORD
    }
  })

  try {
    const promise1 = transport.sendMail({
        to: ourObject.email,
        from: "petadoptioncenter@localhost",
        subject: `Than you for your interest in ${doesPetExist.name}`,
        html: `
        <h3 style="color:purple; font-size:2rem; font-weight:normal;">Thank you ${ourObject.name}</h3>
       <p>We have received you inquery for ${doesPetExist.name}, one of our staff members will contaact you very soon. here is a copy of your message for you personal record:</p>
       <p><em>${ourObject.comment}</em></p> 
        
        `
      })
    
      const promise2 = transport.sendMail({
        to: "petadoptioncenter@gmail",
        from: "petadoptioncenter@localhost",
        subject: `New interest in ${doesPetExist.name}`,
        html: `
        <h3 style="color:purple; font-size:2rem; font-weight:normal;">New contact</h3>
        <p>
        Name: ${ourObject.name}<br>
        Pet interest in: ${doesPetExist.name}<br>
        Email: ${ourObject.email}<br>
        Message: ${ourObject.comment}
        
        </p>
        
        `
      })

      const promise3 = contactsCollection.insertOne(ourObject)

      await Promise.all([promise1, promise2, promise3])
  } catch(err) {
    next(err)
  }

  

    res.send("Thank you for se,ding us data.")
}


exports.viewPetContacts = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        console.log("Not a valid pet id")
        return res.redirect("/")
    }

    const pet = await petsCollection.findOne({_id: new ObjectId(req.params.id)})

    if(!pet) {
        console.log("Pet does not exist")
        return res.redirect("/")
    }

    const contacts = await contactsCollection.find({petId: new ObjectId(req.params.id)}).toArray()
    res.render("pet-contacts", {contacts, pet})
}