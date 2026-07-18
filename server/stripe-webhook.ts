import { Router } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from './supabase-admin';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY || '';
  _stripe = new Stripe(key);
  return _stripe;
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const router = Router();

router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;

    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;

        const sub = await getStripe().subscriptions.retrieve(session.subscription as string) as any;

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub.id,
          plan_id: sub.items.data[0]?.price?.lookup_key || 'free',
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (existing) {
          await supabaseAdmin.from('subscriptions').update({
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', sub.id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const { data: existing } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (existing) {
            await supabaseAdmin.from('subscriptions').update({
              status: 'active',
            }).eq('stripe_subscription_id', invoice.subscription);
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
