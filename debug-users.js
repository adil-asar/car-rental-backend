import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

async function debugUsers() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/car-rental');
        console.log('Connected to database\n');

        // Get all users
        const users = await User.find({}).select('-password');

        console.log(`Total users in database: ${users.length}\n`);

        // Display each user
        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`);
            console.log('  ID:', user._id);
            console.log('  Name:', user.firstName, user.lastName);
            console.log('  Email:', user.email);
            console.log('  Role:', user.role); // This is the key field
            console.log('  Status:', user.status);
            console.log('  Created:', user.createdAt);
            console.log('');
        });

        // Count by role
        const adminCount = await User.countDocuments({ role: 'admin' });
        const userRoleCount = await User.countDocuments({ role: 'user' });
        const noRole = await User.countDocuments({ role: { $exists: false } });

        console.log('=== Role Distribution ===');
        console.log('Admins:', adminCount);
        console.log('Users:', userRoleCount);
        console.log('No role field:', noRole);

        // Count by status
        const activeCount = await User.countDocuments({ status: 'active' });
        const inactiveCount = await User.countDocuments({ status: 'inactive' });
        const suspendedCount = await User.countDocuments({ status: 'suspended' });

        console.log('\n=== Status Distribution ===');
        console.log('Active:', activeCount);
        console.log('Inactive:', inactiveCount);
        console.log('Suspended:', suspendedCount);

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugUsers();
