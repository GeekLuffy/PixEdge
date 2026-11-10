import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteUserAccount } from '@/lib/db';

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({
            success: false,
            error: 'Unauthorized. Please log in to delete your account.'
        }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const confirmText = typeof body?.confirmText === 'string' ? body.confirmText.trim() : '';

        // Strict confirmation requirement: must type DELETE in capital letters
        if (confirmText !== 'DELETE') {
            return NextResponse.json({
                success: false,
                error: 'Please type the word DELETE in capital letters to confirm account deletion.'
            }, { status: 400 });
        }

        const success = await deleteUserAccount(session.user.id);
        if (!success) {
            return NextResponse.json({
                success: false,
                error: 'Failed to delete account. Please try again.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Your account and all associated data have been permanently deleted.'
        });
    } catch (err: any) {
        console.error('Account deletion error:', err);
        return NextResponse.json({
            success: false,
            error: 'Server error while deleting account.'
        }, { status: 500 });
    }
}
