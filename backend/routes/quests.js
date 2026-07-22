const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { authMiddleware } = require('./auth');

// Random quest templates
const questTemplates = [
  { title: 'Pest Control', description: 'Clear out the wooden dummies lurking in the dungeon.', type: 'kill', target: 'WoodenDummy', target_count: 3, reward_gold: 60, reward_exp: 120 },
  { title: 'Deep Dive', description: 'Explore the dungeon and slay 5 dummies.', type: 'kill', target: 'WoodenDummy', target_count: 5, reward_gold: 100, reward_exp: 200 },
  { title: 'Lumberjack\'s Nightmare', description: 'The dummies are awakening! Kill 2 of them.', type: 'kill', target: 'WoodenDummy', target_count: 2, reward_gold: 40, reward_exp: 80 },
  { title: 'The Big Hunt', description: 'A bounty for slaying 8 wooden dummies.', type: 'kill', target: 'WoodenDummy', target_count: 8, reward_gold: 150, reward_exp: 300 },
];

// Get all available quests on the board
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: quests, error } = await supabase
      .from('quests')
      .select('*')
      .eq('is_available', true)
      .limit(10);
      
    if (error) throw error;
    res.json(quests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept a quest (requires partyId)
router.post('/:questId/accept', authMiddleware, async (req, res) => {
  try {
    const { partyId } = req.body;
    if (!partyId) return res.status(400).json({ error: 'Party ID required' });

    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('*')
      .eq('id', partyId)
      .maybeSingle();
      
    if (partyError) throw partyError;
    if (!party) return res.status(404).json({ error: 'Party not found' });
    if (party.active_quests && party.active_quests.length >= 2) return res.status(400).json({ error: 'Party already has 2 active quests' });

    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', req.params.questId)
      .maybeSingle();
      
    if (questError) throw questError;
    if (!quest || !quest.is_available) return res.status(404).json({ error: 'Quest not available' });

    // Mark quest as accepted
    const { data: updatedQuest, error: questUpdateError } = await supabase
      .from('quests')
      .update({ is_available: false, accepted_by: partyId })
      .eq('id', quest.id)
      .select()
      .single();
      
    if (questUpdateError) throw questUpdateError;

    // Add to party
    const newActiveQuests = [...(party.active_quests || []), quest.id];
    const { error: partyUpdateError } = await supabase
      .from('parties')
      .update({ active_quests: newActiveQuests })
      .eq('id', party.id);
      
    if (partyUpdateError) throw partyUpdateError;

    res.json({ message: 'Quest accepted!', quest: updatedQuest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed some initial quests (admin use)
router.post('/seed', async (req, res) => {
  try {
    const { count, error: countError } = await supabase
      .from('quests')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true);
      
    if (countError) throw countError;
    
    const needed = 10 - count;
    if (needed <= 0) return res.json({ message: 'Quest board full' });

    const toInsert = [];
    for (let i = 0; i < needed; i++) {
      const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];
      toInsert.push({ ...template, is_available: true });
    }
    
    const { error: insertError } = await supabase.from('quests').insert(toInsert);
    if (insertError) throw insertError;
    
    res.json({ message: `Added ${needed} quests` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
