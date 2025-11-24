import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SettingWithControls {
  settingName: string;
  platform: string | null;
  controls: { controlId: string; title: string }[];
}

console.log('Checking for policy settings mapped to multiple controls...\n');

async function checkMultiControlMappings() {
  // Get all M365 settings with their control mappings
  const settings = await prisma.m365Setting.findMany({
    include: {
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  // Filter settings that are mapped to multiple controls
  const multiControlSettings = settings
    .map((setting) => ({
      settingName: setting.settingName,
      platform: setting.platform,
      controls: setting.controlMappings.map((m) => ({
        controlId: m.control.controlId,
        title: m.control.title,
      })),
    }))
    .filter((s) => s.controls.length > 1)
    .sort((a, b) => b.controls.length - a.controls.length);

  const results = multiControlSettings;

  if (results.length === 0) {
    console.log('No settings are mapped to multiple controls.');
  } else {
    console.log(`Found ${results.length} settings mapped to multiple controls:\n`);

    // Group by platform to see patterns
    const platformGroups = new Map<string, SettingWithControls[]>();

    results.forEach((result) => {
      const platform = result.platform || 'Unknown';
      if (!platformGroups.has(platform)) {
        platformGroups.set(platform, []);
      }
      platformGroups.get(platform)!.push(result);
    });

    // Display results grouped by platform
    platformGroups.forEach((settings, platform) => {
      console.log(`\n=== ${platform.toUpperCase()} (${settings.length} settings) ===`);

      settings.forEach((setting) => {
        console.log(`\n📋 ${setting.settingName}`);
        console.log(`   Mapped to ${setting.controls.length} controls:`);
        setting.controls.forEach((control) => {
          console.log(`   • ${control.controlId} - ${control.title}`);
        });
      });
    });

    // Summary statistics
    console.log('\n\n=== SUMMARY ===');
    const maxControls = Math.max(...results.map((r) => r.controls.length));
    console.log(`Total settings with multi-control mappings: ${results.length}`);
    console.log(`Maximum controls per setting: ${maxControls}`);

    const settingsWithMax = results.filter((r) => r.controls.length === maxControls);
    if (settingsWithMax.length > 0) {
      console.log(`\nSettings mapped to the most controls (${maxControls}):`);
      settingsWithMax.forEach((s) => {
        console.log(`  • ${s.settingName} (${s.platform || 'Unknown'})`);
      });
    }
  }

  await prisma.$disconnect();
}

checkMultiControlMappings().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
