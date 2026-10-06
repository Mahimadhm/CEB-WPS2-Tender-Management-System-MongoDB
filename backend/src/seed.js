require('dotenv').config();

const mongoose = require('mongoose');

const User = require('./models/User');
const Category = require('./models/Category');
const Department = require('./models/Department');
const Committee = require('./models/Committee');
const Bidder = require('./models/Bidder');

async function populateSeedData() {
  console.log('Seeding CEB Tender Management System data to MongoDB...');

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log(
        `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`
      );
    }

    // User accounts are not seeded.
    // Production users must be created and managed through User Management.

    // 2. Demo Categories
    const categories = [
      {
        name: 'Goods',
        description: 'General Goods & Heavy Equipment',
        status: 'Active'
      },
      {
        name: 'Services',
        description: 'Consultancy & Technical Services',
        status: 'Active'
      },
      {
        name: 'Works',
        description: 'Civil Engineering & Construction Works',
        status: 'Active'
      },
      {
        name: 'Consultancy',
        description: 'Specialized Engineering Advisory Services',
        status: 'Active'
      }
    ];

    for (const cat of categories) {
      const existingCat = await Category.findOne({
        name: cat.name
      });

      if (!existingCat) {
        await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      }
    }

    // 3. Demo Departments
    const departments = [
      {
        name: 'Generation',
        code: 'GEN',
        head_of_department: 'Eng. P. Bandara',
        description: 'Power Generation Division',
        status: 'Active'
      },
      {
        name: 'Transmission',
        code: 'TRN',
        head_of_department: 'Eng. K. Fernando',
        description: 'High Voltage Transmission Grid',
        status: 'Active'
      },
      {
        name: 'Distribution',
        code: 'DST',
        head_of_department: 'Eng. R. De Silva',
        description: 'Electricity Distribution Network',
        status: 'Active'
      }
    ];

    for (const dept of departments) {
      const existingDept = await Department.findOne({
        name: dept.name
      });

      if (!existingDept) {
        await Department.create(dept);
        console.log(`Created department: ${dept.name}`);
      }
    }

    // 4. Demo Committees
    const committees = [
      {
        committee_number: 'TEC/2023/001',
        member1: 'K.A. Perera',
        member2: 'M.B. Silva',
        member3: 'S.C. Fernando',
        additional_members: ['Eng. D. Jayasooriya'],
        appointed_date: '2023-01-15',
        status: 'Active'
      },
      {
        committee_number: 'TEC/2023/002',
        member1: 'D.E. Wickramasinghe',
        member2: 'G.H. Jayawardena',
        member3: 'I.J. Rajapaksa',
        additional_members: [],
        appointed_date: '2023-02-20',
        status: 'Active'
      }
    ];

    for (const comm of committees) {
      const existingComm = await Committee.findOne({
        committee_number: comm.committee_number
      });

      if (!existingComm) {
        await Committee.create(comm);
        console.log(
          `Created committee: ${comm.committee_number}`
        );
      }
    }

    // 5. Demo Bidders
    const bidders = [
      {
        name: 'Lanka Electrical Co.',
        email: 'info@lankaelectrical.lk',
        contact: '+94112345678',
        address: 'Colombo 03'
      },
      {
        name: 'PowerTech Solutions',
        email: 'contact@powertech.lk',
        contact: '+94771234567',
        address: 'Kandy'
      }
    ];

    for (const bidder of bidders) {
      const existingBidder = await Bidder.findOne({
        name: bidder.name
      });

      if (!existingBidder) {
        await Bidder.create(bidder);
        console.log(`Created bidder: ${bidder.name}`);
      }
    }

    console.log('----------------------------------------------------');
    console.log('CEB Tender Management System seeding complete!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  }
}

if (require.main === module) {
  populateSeedData()
    .then(async () => {
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);

      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }

      process.exit(1);
    });
}

module.exports = { populateSeedData };
