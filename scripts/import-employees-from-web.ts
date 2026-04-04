import prisma from '../src/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface EmployeeData {
  prename: string;
  fname: string;
  lname: string;
  sex: string;
  positionName: string;
  employeeNumber?: string;
  nickname?: string;
  imageUrl?: string;
}

// Parse employee name from text
// Example: "นางพรพรรณ พาธูปทอง (แอ๊ด) พนักงานนวดแผนไทย No.6"
function parseEmployee(text: string): EmployeeData | null {
  try {
    // Remove extra whitespace
    text = text.trim();
    
    // Extract employee number (No.XX) - case insensitive and handle various formats
    // Try multiple patterns to catch different formats
    let numberMatch = text.match(/No\.\s*(\d+)/i);
    if (!numberMatch) {
      // Try without period: "No 21" or "No21"
      numberMatch = text.match(/No\s+(\d+)/i) || text.match(/No(\d+)/i);
    }
    if (!numberMatch) {
      // Try with different spacing: "No. 21" or "No .21"
      numberMatch = text.match(/No\s*\.\s*(\d+)/i);
    }
    
    const employeeNumber = numberMatch ? numberMatch[1] : undefined;
    
    // Debug logging for employee number extraction
    if (employeeNumber) {
      console.log(`    ✓ Extracted employee_number: ${employeeNumber} from: ${text.substring(0, 80)}...`);
    } else {
      console.log(`    ⚠ WARNING: No employee_number found in: ${text.substring(0, 80)}...`);
      // Try to find any number pattern that might be employee number
      const anyNumber = text.match(/\b(\d{1,3})\b/);
      if (anyNumber) {
        console.log(`    ℹ Found number in text: ${anyNumber[1]} (might be employee number)`);
      }
    }
    
    // Remove employee number and position from text
    let cleanText = text.replace(/No\.\d+/, '').trim();
    
    // Extract position (usually at the end, before No.)
    const positionMatch = cleanText.match(/พนักงาน[^\s]+(?:\s[^\s]+)*/);
    const positionName = positionMatch ? positionMatch[0].trim() : 'พนักงานนวดแผนไทย';
    cleanText = cleanText.replace(/พนักงาน[^\s]+(?:\s[^\s]+)*/, '').trim();
    
    // Clean up any HTML tags or special characters that might have leaked in
    cleanText = cleanText.replace(/<[^>]+>/g, '').replace(/[">]/g, '').trim();
    
    // Extract nickname in parentheses
    let nickname: string | undefined;
    const nicknameMatch = cleanText.match(/\(([^)]+)\)/);
    if (nicknameMatch) {
      nickname = nicknameMatch[1].trim();
      cleanText = cleanText.replace(/\([^)]+\)/, '').trim();
    }
    
    // Parse name: prename + fname + lname
    // Examples: "นางพรพรรณ พาธูปทอง", "น.ส.ปาณิศา กาญจนคงคา", "นายภานุสนองกร บุญผ่อง"
    const prenamePatterns = ['นาง', 'น.ส.', 'นาย', 'นางสาว'];
    let prename = '';
    let namePart = cleanText;
    
    for (const pattern of prenamePatterns) {
      if (cleanText.startsWith(pattern)) {
        prename = pattern;
        namePart = cleanText.substring(pattern.length).trim();
        break;
      }
    }
    
    // If no prename found, try to infer from context
    if (!prename) {
      // Default to "นาง" if not specified
      prename = 'นาง';
    }
    
    // Determine sex from prename
    let sex = 'หญิง';
    if (prename === 'นาย') {
      sex = 'ชาย';
    } else if (prename === 'น.ส.' || prename === 'นางสาว') {
      sex = 'หญิง';
    } else if (prename === 'นาง') {
      sex = 'หญิง';
    }
    
    // Split name into first and last name
    const nameParts = namePart.split(/\s+/);
    const fname = nameParts[0] || '';
    const lname = nameParts.slice(1).join(' ') || '';
    
    if (!fname) {
      return null;
    }
    
    return {
      prename,
      fname,
      lname,
      sex,
      positionName,
      employeeNumber,
      nickname,
    };
  } catch (error) {
    console.error('Error parsing employee:', text, error);
    return null;
  }
}

// Get or create position ID
async function getPositionId(positionName: string): Promise<number | null> {
  try {
    // Try to find existing position
    const existing = await prisma.cPosition.findFirst({
      where: {
        position: {
          contains: positionName,
        },
      },
    });
    
    if (existing) {
      return existing.id;
    }
    
    // Try to find by partial match
    const allPositions = await prisma.cPosition.findMany();
    const matched = allPositions.find(p => 
      p.position && (
        p.position.includes('นวดแผนไทย') || 
        p.position.includes(positionName) ||
        positionName.includes(p.position || '')
      )
    );
    
    if (matched) {
      return matched.id;
    }
    
    // Create new position if not found
    const newPosition = await prisma.cPosition.create({
      data: {
        position: positionName,
      },
    });
    
    console.log(`Created new position: ${positionName} (ID: ${newPosition.id})`);
    return newPosition.id;
  } catch (error) {
    console.error('Error getting position ID:', error);
    return null;
  }
}

// Check if employee already exists
async function employeeExists(fname: string, lname: string): Promise<boolean> {
  try {
    const existing = await prisma.employee.findFirst({
      where: {
        fname,
        lname,
      },
    });
    return !!existing;
  } catch (error) {
    console.error('Error checking employee existence:', error);
    return false;
  }
}

// Download image from URL and save to public/images
async function downloadImage(imageUrl: string, employeeName: string): Promise<string | null> {
  try {
    // Make absolute URL if relative
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `https://ttm.plkhealth.go.th${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    
    console.log(`  Downloading image from: ${fullUrl}`);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.log(`  Failed to download image: ${response.status}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    // Get file extension from URL or Content-Type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('gif')) extension = 'gif';
    else if (contentType.includes('webp')) extension = 'webp';
    
    // Extract extension from URL if available
    const urlMatch = fullUrl.match(/\.(jpg|jpeg|png|gif|webp)/i);
    if (urlMatch) {
      extension = urlMatch[1].toLowerCase();
    }
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'images');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    
    // Generate filename
    const timestamp = Date.now();
    const sanitizedName = employeeName.replace(/[^a-zA-Z0-9ก-๙]/g, '').substring(0, 20);
    const filename = `staff-${sanitizedName}-${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);
    
    // Save file
    await writeFile(filepath, imageBuffer);
    
    // Return relative path
    const imagePath = `/images/${filename}`;
    console.log(`  ✓ Image saved: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error(`  Error downloading image:`, error);
    return null;
  }
}

// Extract employee data with images from HTML
function extractEmployeesFromHTML(html: string): Array<{ text: string; imageUrl?: string }> {
  const employees: Array<{ text: string; imageUrl?: string }> = [];
  
  console.log('Extracting employees from HTML...');
  
  // Strategy 1: Find all <a> tags that contain employee info
  const linkPattern = /<a[^>]*>[\s\S]*?<\/a>/gi;
  const links = html.match(linkPattern) || [];
  console.log(`Found ${links.length} links in HTML`);
  
  for (const link of links) {
    // Check if this link contains employee name pattern
    if (!link.match(/(นาง|น\.ส\.|นาย|นางสาว)[^<]+(?:พนักงาน|No\.)/)) {
      continue;
    }
    
    // Extract image URL - try multiple patterns
    let imageUrl: string | undefined;
    
    // Pattern 1: <img src="...">
    const imgMatch1 = link.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch1) {
      imageUrl = imgMatch1[1];
    }
    
    // Pattern 2: <img src='...'>
    if (!imageUrl) {
      const imgMatch2 = link.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
      if (imgMatch2) {
        imageUrl = imgMatch2[1];
      }
    }
    
    // Pattern 3: Look for img tag before or after the link
    if (!imageUrl) {
      // Find img tag near this link in the HTML
      const linkIndex = html.indexOf(link);
      const beforeContext = html.substring(Math.max(0, linkIndex - 500), linkIndex);
      const afterContext = html.substring(linkIndex + link.length, linkIndex + link.length + 500);
      
      const imgBefore = beforeContext.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      const imgAfter = afterContext.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      
      if (imgBefore) imageUrl = imgBefore[1];
      else if (imgAfter) imageUrl = imgAfter[1];
    }
    
    // Extract text content - preserve No.XX pattern
    let textContent = link
      .replace(/<img[^>]*>/gi, '') // Remove img tags first
      .replace(/<[^>]+>/g, ' ') // Replace other HTML tags with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Ensure No.XX pattern is preserved (sometimes HTML tags might break it)
    // Look for No.XX pattern in original link if missing from textContent
    if (!textContent.match(/No\.\s*\d+/i)) {
      const noMatch = link.match(/No\.\s*\d+/i);
      if (noMatch) {
        // Append No.XX if found in original HTML but missing in cleaned text
        textContent = textContent.trim() + ' ' + noMatch[0];
      }
    }
    
    if (textContent && textContent.match(/(นาง|น\.ส\.|นาย|นางสาว)/)) {
      // Check if employee number is present
      const hasNumber = textContent.match(/No\.\s*\d+/i);
      console.log(`  Found employee: ${textContent.substring(0, 80)}... ${hasNumber ? `✓ Has No.` : '⚠ Missing No.'} Image: ${imageUrl || 'NOT FOUND'}`);
      employees.push({ text: textContent, imageUrl });
    }
  }
  
  // Strategy 2: If no employees found, try finding all img tags and match with nearby text
  if (employees.length === 0) {
    console.log('Trying alternative extraction method...');
    const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const images: Array<{ url: string; index: number }> = [];
    let match;
    
    while ((match = imgPattern.exec(html)) !== null) {
      images.push({ url: match[1], index: match.index });
    }
    
    console.log(`Found ${images.length} images in HTML`);
    
    // Strategy 2a: Find all employee name patterns first
    const namePattern = /(นาง|น\.ส\.|นาย|นางสาว)[^<]+(?:พนักงาน[^<]*)?(?:No\.\d+)?/g;
    const employeeNames: Array<{ text: string; index: number }> = [];
    let nameMatch;
    
    while ((nameMatch = namePattern.exec(html)) !== null) {
      let textContent = nameMatch[0]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Ensure No.XX is included - check original match for No.XX pattern
      if (!textContent.match(/No\.\s*\d+/i)) {
        // Look for No.XX near this match in the HTML
        const contextStart = Math.max(0, nameMatch.index - 100);
        const contextEnd = Math.min(html.length, nameMatch.index + nameMatch[0].length + 100);
        const context = html.substring(contextStart, contextEnd);
        const noMatch = context.match(/No\.\s*\d+/i);
        if (noMatch) {
          textContent = textContent.trim() + ' ' + noMatch[0];
        }
      }
      
      if (textContent && textContent.length > 10) {
        const hasNumber = textContent.match(/No\.\s*\d+/i);
        console.log(`    Extracted name: ${textContent.substring(0, 60)}... ${hasNumber ? '✓ Has No.' : '⚠ Missing No.'}`);
        employeeNames.push({ text: textContent, index: nameMatch.index });
      }
    }
    
    console.log(`Found ${employeeNames.length} employee names in HTML`);
    
    // Match images with employee names (find closest image to each name)
    for (const emp of employeeNames) {
      // Find the closest image to this employee name
      let closestImage: { url: string; distance: number } | null = null;
      
      for (const img of images) {
        const distance = Math.abs(img.index - emp.index);
        
        // Only consider images within 2000 characters
        if (distance < 2000) {
          if (!closestImage || distance < closestImage.distance) {
            closestImage = { url: img.url, distance };
          }
        }
      }
      
      if (closestImage) {
        console.log(`  Matched: ${emp.text.substring(0, 40)}... with image (distance: ${closestImage.distance})`);
        employees.push({ text: emp.text, imageUrl: closestImage.url });
      } else {
        console.log(`  No image found for: ${emp.text.substring(0, 40)}...`);
        employees.push({ text: emp.text }); // Add without image
      }
    }
  }
  
  console.log(`Total employees extracted: ${employees.length}`);
  return employees;
}

// Generate date range from start to end date (YYYY-MM-DD format)
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
}

// Main function to import employees
async function importEmployees() {
  // Generate date range from 2025-12-20 to 2025-12-31
  const dates = generateDateRange('2025-12-20', '2025-12-31');
  
  console.log(`\n=== Starting import for ${dates.length} days (${dates[0]} to ${dates[dates.length - 1]}) ===\n`);
  
  // Use Map to store unique employees (key: fname+lname, value: employee data)
  const uniqueEmployees = new Map<string, { text: string; imageUrl?: string }>();
  
  // Fetch employees from each date
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const url = `https://ttm.plkhealth.go.th/ttm/web/booking/default/book-man?book_date=${date}&book_time=08%3A30%3A00`;
    
    console.log(`\n[${i + 1}/${dates.length}] Fetching data from: ${date}`);
    
    try {
      // Fetch HTML from URL
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`  ⚠ HTTP error! status: ${response.status} - Skipping this date`);
        continue;
      }
      
      const html = await response.text();
      
      // Try to extract employees with images from HTML
      const employeesWithImages = extractEmployeesFromHTML(html);
      
      if (employeesWithImages.length > 0) {
        console.log(`  Found ${employeesWithImages.length} employees from ${date}`);
        
        // Add to unique employees map (use text as key to avoid duplicates)
        for (const emp of employeesWithImages) {
          // Parse employee to get fname and lname for unique key
          const parsed = parseEmployee(emp.text);
          if (parsed) {
            const key = `${parsed.fname}|${parsed.lname}`;
            // Only add if not exists, or if new one has image and old one doesn't
            if (!uniqueEmployees.has(key)) {
              uniqueEmployees.set(key, emp);
            } else {
              const existing = uniqueEmployees.get(key)!;
              // Update if new one has image and existing doesn't
              if (emp.imageUrl && !existing.imageUrl) {
                uniqueEmployees.set(key, emp);
                console.log(`    Updated image for: ${parsed.fname} ${parsed.lname}`);
              }
            }
          } else {
            // If parsing fails, use text as key
            if (!uniqueEmployees.has(emp.text)) {
              uniqueEmployees.set(emp.text, emp);
            }
          }
        }
      } else {
        console.log(`  ⚠ No employees found for ${date}`);
      }
      
      // Add small delay to avoid overwhelming the server
      if (i < dates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`  Error fetching data for ${date}:`, error);
      // Continue with next date instead of failing completely
      continue;
    }
  }
  
  // Process all unique employees
  const allEmployees = Array.from(uniqueEmployees.values());
  console.log(`\n=== Total unique employees found: ${allEmployees.length} ===\n`);
  
  if (allEmployees.length > 0) {
    await processEmployeesWithImages(allEmployees);
  } else {
    console.log('No employees found from any date. Using hardcoded fallback data...');
    // Fallback: use hardcoded data (without images)
    const hardcodedEmployees = [
      { text: 'นางพรพรรณ พาธูปทอง (แอ๊ด) พนักงานนวดแผนไทย No.6' },
      { text: 'นางสุพัตรา ต่ายพูล (องุ่น) พนักงานนวดแผนไทย No.12' },
      { text: 'นางตรีนัส ไทยโกษา (แบ๊ค) พนักงานนวดแผนไทย No.18' },
      { text: 'น.ส.ปาณิศา กาญจนคงคา (ปา) พนักงานนวดแผนไทย No.20' },
      { text: 'น.ส.นภัสกร ยอมสุข (เตี้ย) พนักงานนวดแผนไทย No.21' },
      { text: 'นางสำเนียง บุญคง (ตอง) พนักงานนวดแผนไทย No.22' },
      { text: 'นายภานุสนองกร บุญผ่อง (โต้ง) พนักงานนวดแผนไทย No.30' },
      { text: 'น.ส.ศิริพร พารี(ตั้๊ก) พนักงานนวดแผนไทย No.32' },
      { text: 'นางณกมล ธรรมสอน(ป้าต้อ) พนักงานนวดแผนไทย No.34' },
      { text: 'นายศุภงวัจณ์ สยมชัย พนักงานนวดแผนไทย No.35' },
    ];
    
    await processEmployees(hardcodedEmployees);
  }
}

async function processEmployeesWithImages(employees: Array<{ text: string; imageUrl?: string }>) {
  console.log(`Processing ${employees.length} employees with images...`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const { text, imageUrl } of employees) {
    try {
      const employeeData = parseEmployee(text);
      
      if (!employeeData) {
        console.log(`Skipped (parse failed): ${text}`);
        skipped++;
        continue;
      }
      
      // Debug logging for employee data
      console.log(`  Processing: ${employeeData.prename} ${employeeData.fname} ${employeeData.lname}${employeeData.nickname ? ` (${employeeData.nickname})` : ''}${employeeData.employeeNumber ? ` No.${employeeData.employeeNumber}` : ''}`);
      
      // Check if employee already exists
      const existing = await prisma.employee.findFirst({
        where: {
          fname: employeeData.fname,
          lname: employeeData.lname,
        },
      });
      
      if (existing) {
        // If employee exists, try to update with image, nickname, or employee_number if missing
        let hasUpdates = false;
        let imagePath: string | null = null;
        
        // Check current values in database
        const existingData = await prisma.$queryRaw<Array<{ 
          image: string | null;
          nickname: string | null;
          employee_number: string | null;
        }>>`
          SELECT image, nickname, employee_number FROM employee WHERE id = ${existing.id}
        `;
        
        const currentData = existingData[0];
        
        // Download image if needed
        if (imageUrl && !currentData?.image) {
          const fullName = `${employeeData.prename}${employeeData.fname}${employeeData.lname}`;
          imagePath = await downloadImage(imageUrl, fullName);
        }
        
        // Build update query with only fields that need updating
        const updateFields: string[] = [];
        const updateParams: any[] = [];
        
        if (imagePath) {
          updateFields.push('image = ?');
          updateParams.push(imagePath);
          hasUpdates = true;
        }
        
        if (employeeData.nickname && !currentData?.nickname) {
          updateFields.push('nickname = ?');
          updateParams.push(employeeData.nickname);
          hasUpdates = true;
        }
        
        // Update employee_number if provided and missing or different
        if (employeeData.employeeNumber) {
          const currentEmpNo = currentData?.employee_number?.toString().trim();
          const newEmpNo = employeeData.employeeNumber.toString().trim();
          
          if (!currentEmpNo || currentEmpNo !== newEmpNo) {
            updateFields.push('employee_number = ?');
            updateParams.push(newEmpNo);
            hasUpdates = true;
            console.log(`    Will update employee_number: "${newEmpNo}" (current: "${currentEmpNo || 'null'}")`);
          } else {
            console.log(`    employee_number already set: "${currentEmpNo}"`);
          }
        } else {
          console.log(`    ⚠ No employee_number found in parsed data`);
        }
        
        if (hasUpdates) {
          updateParams.push(existing.id);
          await prisma.$executeRawUnsafe(
            `UPDATE employee SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            ...updateParams
          );
          console.log(`  ✓ Updated: ${employeeData.prename} ${employeeData.fname} ${employeeData.lname} (${updateFields.join(', ')})`);
          imported++;
          continue;
        }
        
        console.log(`Skipped (already exists): ${employeeData.prename} ${employeeData.fname} ${employeeData.lname}`);
        skipped++;
        continue;
      }
      
      // Download image if available
      let imagePath: string | null = null;
      if (imageUrl) {
        console.log(`  Processing image for ${employeeData.fname} ${employeeData.lname}...`);
        const fullName = `${employeeData.prename}${employeeData.fname}${employeeData.lname}`;
        imagePath = await downloadImage(imageUrl, fullName);
        if (!imagePath) {
          console.log(`  ⚠ Warning: Failed to download image for ${employeeData.fname} ${employeeData.lname}`);
        }
      } else {
        console.log(`  ⚠ No image URL found for ${employeeData.fname} ${employeeData.lname}`);
      }
      
      // Get position ID
      const positionId = await getPositionId(employeeData.positionName);
      
      // Create employee using raw query to include image, nickname, and employee_number fields
      const prename = employeeData.prename;
      const fname = employeeData.fname;
      const lname = employeeData.lname;
      const sex = employeeData.sex;
      const is_active = 'yes';
      const image = imagePath;
      const nickname = employeeData.nickname || null;
      const employee_number = employeeData.employeeNumber ? employeeData.employeeNumber.toString().trim() : null;
      
      // Debug logging before insert
      if (employee_number) {
        console.log(`    Inserting with employee_number: "${employee_number}"`);
      } else {
        console.log(`    ⚠ Warning: No employee_number to insert for ${employeeData.fname} ${employeeData.lname}`);
      }
      
      await prisma.$executeRaw`
        INSERT INTO employee (
          prename, fname, lname, sex, position, is_active, image, nickname, employee_number, created_at, updated_at
        ) VALUES (
          ${prename}, ${fname}, ${lname}, ${sex}, ${positionId}, ${is_active}, ${image}, ${nickname}, ${employee_number}, NOW(), NOW()
        )
      `;
      
      // Get the newly created employee ID
      const result = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT LAST_INSERT_ID() as id
      `;
      const newId = result[0]?.id;
      
      const logParts = [
        employeeData.prename,
        employeeData.fname,
        employeeData.lname,
        employeeData.nickname ? `(${employeeData.nickname})` : '',
        employeeData.employeeNumber ? `No.${employeeData.employeeNumber}` : '',
        imagePath ? `Image: ${imagePath}` : ''
      ].filter(Boolean);
      
      console.log(`✓ Imported: ${logParts.join(' ')} (ID: ${newId})`);
      imported++;
      
    } catch (error) {
      console.error(`Error processing: ${text}`, error);
      errors++;
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

async function processEmployees(employees: Array<{ text: string; imageUrl?: string }>) {
  await processEmployeesWithImages(employees);
}

// Run the import
if (require.main === module) {
  importEmployees()
    .then(() => {
      console.log('Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importEmployees, parseEmployee };

